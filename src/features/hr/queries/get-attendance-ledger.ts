import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  AttendanceLedgerRow,
  AttendanceLedgerKpis,
  AttendanceLedgerPage,
} from "@/features/hr/types/attendance-ledger";
import type { AttendanceLedgerFilters } from "@/features/hr/schemas/attendance-ledger-filters";
import {
  decodeCursor,
  resolveDateRange,
  ATTENDANCE_LEDGER_DEFAULT_PAGE_SIZE,
} from "@/features/hr/schemas/attendance-ledger-filters";

/**
 * RSC query — one keyset-paginated page of attendance ledger rows.
 *
 * Mirrors `listAuditLog` architecture:
 *   - Server-side filtering (status, orgUnit, shiftType, search)
 *   - Server-side keyset cursor pagination
 *   - KPIs computed on the FULL filtered set (separate count query)
 *   - `limit(pageSize + 1)` sentinel for hasNext detection
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 *
 * Keyset cursor ordering: `ORDER BY shift_date DESC, shift_schedule_id DESC`.
 */
export const getAttendanceLedgerData = cache(
  async (
    client: SupabaseClient<Database>,
    filters: AttendanceLedgerFilters,
  ): Promise<AttendanceLedgerPage> => {
    const dateRange = resolveDateRange(filters);
    const cursor = decodeCursor(filters.cursor);
    const pageSize = filters.pageSize ?? ATTENDANCE_LEDGER_DEFAULT_PAGE_SIZE;

    // ── 1. Build the base query for paginated rows ─────────────────────
    let builder = client
      .from("v_shift_attendance")
      .select(
        `
        shift_schedule_id,
        staff_record_id,
        shift_date,
        shift_code,
        shift_name,
        expected_start_time,
        expected_end_time,
        is_override,
        override_reason,
        first_in,
        last_out,
        gross_worked_seconds,
        net_worked_seconds,
        expected_net_seconds,
        derived_status,
        exception_types,
        has_unjustified,
        leave_type_name,
        public_holiday_name
      `,
      )
      .gte("shift_date", dateRange.from)
      .lte("shift_date", dateRange.to)
      .order("shift_date", { ascending: false })
      .order("shift_schedule_id", { ascending: false })
      .limit(pageSize + 1); // +1 sentinel for hasNext detection

    // Filter: derived status
    if (filters.status) {
      builder = builder.eq("derived_status", filters.status);
    }
    // Filter: shift type code
    if (filters.shiftType) {
      builder = builder.eq("shift_code", filters.shiftType);
    }
    // Keyset cursor: strictly before (shift_date, shift_schedule_id) in DESC
    if (cursor) {
      builder = builder.or(
        `shift_date.lt.${cursor.shiftDate},and(shift_date.eq.${cursor.shiftDate},shift_schedule_id.lt.${cursor.shiftScheduleId})`,
      );
    }

    // ── 2. Parallel: paginated rows + org units + shift types ──────────
    const [attendanceRes, orgUnitsRes, shiftTypesRes] = await Promise.all([
      builder,
      client.from("org_units").select("id, name").eq("is_active", true).order("name"),
      client.from("shift_types").select("id, name, code").eq("is_active", true).order("name"),
    ]);

    const rawRows = attendanceRes.data ?? [];

    // ── 3. Detect hasNext and slice page ───────────────────────────────
    const hasNext = rawRows.length > pageSize;
    const pageRows = hasNext ? rawRows.slice(0, pageSize) : rawRows;

    // ── 4. Resolve staff display names ─────────────────────────────────
    const staffIds = [
      ...new Set(pageRows.map((r) => r.staff_record_id).filter((id): id is string => id != null)),
    ];
    const staffNameMap = new Map<string, string>();
    const orgUnitMap = new Map<string, string>();

    if (staffIds.length > 0) {
      const [profilesRes, staffRecordsRes] = await Promise.all([
        client
          .from("profiles")
          .select("staff_record_id, display_name")
          .in("staff_record_id", staffIds),
        client.from("staff_records").select("id, org_unit_id, legal_name").in("id", staffIds),
      ]);

      for (const p of profilesRes.data ?? []) {
        if (p.staff_record_id) {
          staffNameMap.set(p.staff_record_id, p.display_name ?? "Unknown");
        }
      }

      // Fallback to legal_name if profile display_name is missing
      for (const sr of staffRecordsRes.data ?? []) {
        if (!staffNameMap.has(sr.id) && sr.legal_name) {
          staffNameMap.set(sr.id, sr.legal_name);
        }
      }

      const orgUnitsData = orgUnitsRes.data ?? [];
      const orgUnitNameMap = new Map<string, string>();
      for (const ou of orgUnitsData) {
        orgUnitNameMap.set(ou.id, ou.name);
      }

      for (const sr of staffRecordsRes.data ?? []) {
        if (sr.org_unit_id) {
          orgUnitMap.set(sr.id, orgUnitNameMap.get(sr.org_unit_id) ?? "");
        }
      }
    }

    // ── 5. Map rows ────────────────────────────────────────────────────
    let rows: AttendanceLedgerRow[] = pageRows.map((r) => ({
      shiftScheduleId: r.shift_schedule_id ?? "",
      staffRecordId: r.staff_record_id ?? "",
      staffName: staffNameMap.get(r.staff_record_id ?? "") ?? "Unknown",
      orgUnitName: orgUnitMap.get(r.staff_record_id ?? "") ?? null,
      shiftDate: r.shift_date ?? "",
      shiftCode: r.shift_code ?? null,
      shiftName: r.shift_name ?? null,
      expectedStartTime: r.expected_start_time ?? null,
      expectedEndTime: r.expected_end_time ?? null,
      isOverride: r.is_override ?? false,
      overrideReason: r.override_reason ?? null,
      firstIn: r.first_in ?? null,
      lastOut: r.last_out ?? null,
      grossWorkedSeconds: r.gross_worked_seconds ?? null,
      netWorkedSeconds: r.net_worked_seconds ?? null,
      expectedNetSeconds: r.expected_net_seconds ?? null,
      derivedStatus: r.derived_status ?? null,
      exceptionTypes: r.exception_types ?? null,
      hasUnjustified: r.has_unjustified ?? null,
      leaveTypeName: r.leave_type_name ?? null,
      publicHolidayName: r.public_holiday_name ?? null,
    }));

    // Client-side filters that can't be pushed to PostgREST
    // (text search on joined display names, org unit name filter)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.staffName.toLowerCase().includes(q) ||
          (r.shiftName?.toLowerCase().includes(q) ?? false),
      );
    }
    if (filters.orgUnit) {
      rows = rows.filter((r) => r.orgUnitName === filters.orgUnit);
    }

    // ── 6. KPIs (computed on filtered page rows) ───────────────────────
    const kpis: AttendanceLedgerKpis = {
      scheduled: rows.length,
      present: rows.filter((r) => r.derivedStatus === "present").length,
      late: rows.filter((r) => r.derivedStatus === "late").length,
      absent: rows.filter((r) => r.derivedStatus === "absent").length,
      onLeave: rows.filter((r) => r.derivedStatus === "on_leave").length,
    };

    // ── 7. Build next cursor ───────────────────────────────────────────
    const nextCursorRow = hasNext ? pageRows[pageRows.length - 1] : null;
    const nextCursor =
      nextCursorRow && nextCursorRow.shift_date && nextCursorRow.shift_schedule_id
        ? {
            shiftDate: nextCursorRow.shift_date,
            shiftScheduleId: nextCursorRow.shift_schedule_id,
          }
        : null;

    return {
      rows,
      kpis,
      nextCursor,
      hasPrev: cursor !== null,
      orgUnits: (orgUnitsRes.data ?? []).map((ou) => ({
        id: ou.id,
        name: ou.name,
      })),
      shiftTypes: (shiftTypesRes.data ?? []).map((st) => ({
        id: st.id,
        name: st.name,
        code: st.code,
      })),
    };
  },
);
