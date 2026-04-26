import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  DiscrepancyQueueRow,
  DiscrepancyQueueKpis,
  DiscrepancyQueueData,
} from "@/features/hr/types/discrepancy-queue";
import type { DiscrepancyQueueFilters } from "@/features/hr/schemas/discrepancy-queue-filters";
import {
  decodeQueueCursor,
  QUEUE_DEFAULT_PAGE_SIZE,
} from "@/features/hr/schemas/discrepancy-queue-filters";

/**
 * RSC query — data for `/management/hr/attendance/queue`.
 *
 * Server-side keyset cursor pagination on `clarification_submitted_at ASC`.
 * Queue is always `status = 'pending_review'` per ADR-0007.
 *
 * NOTE: `profiles.staff_record_id` → `staff_records.id` (indirect mapping via FK).
 */
export const getDiscrepancyQueueData = cache(
  async (
    client: SupabaseClient<Database>,
    filters: DiscrepancyQueueFilters,
  ): Promise<DiscrepancyQueueData> => {
    const pageSize = filters.pageSize ?? QUEUE_DEFAULT_PAGE_SIZE;
    const cursor = decodeQueueCursor(filters.cursor);

    // ── 1. Build paginated query ───────────────────────────────────────
    let builder = client
      .from("attendance_exceptions")
      .select(
        `
        id,
        shift_schedule_id,
        staff_record_id,
        type,
        status,
        detail,
        staff_clarification,
        hr_note,
        clarification_submitted_at,
        reviewed_at,
        created_at,
        shift_schedules!inner (
          shift_date,
          expected_start_time,
          expected_end_time,
          shift_types!inner (
            name,
            code
          )
        )
      `,
      )
      .eq("status", "pending_review")
      .order("clarification_submitted_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(pageSize + 1);

    // Filter: exception type
    if (filters.exceptionType) {
      builder = builder.eq(
        "type",
        filters.exceptionType as
          | "late_arrival"
          | "early_departure"
          | "missing_clock_in"
          | "missing_clock_out"
          | "absent",
      );
    }

    // Keyset cursor: strictly after (submitted_at, id) in ASC
    if (cursor) {
      builder = builder.or(
        `clarification_submitted_at.gt.${cursor.submittedAt},and(clarification_submitted_at.eq.${cursor.submittedAt},id.gt.${cursor.id})`,
      );
    }

    // ── 2. Parallel fetch ──────────────────────────────────────────────
    const [exceptionsRes, leaveTypesRes, totalCountRes] = await Promise.all([
      builder,
      client.from("leave_types").select("id, name, code").eq("is_active", true).order("name"),
      // KPI: total pending_review count (not just page)
      client
        .from("attendance_exceptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
    ]);

    const rawRows = exceptionsRes.data ?? [];

    // ── 3. Detect hasNext and slice page ───────────────────────────────
    const hasNext = rawRows.length > pageSize;
    const pageRows = hasNext ? rawRows.slice(0, pageSize) : rawRows;

    // ── 4. Resolve staff display names ─────────────────────────────────
    const staffIds = [
      ...new Set(pageRows.map((r) => r.staff_record_id).filter((id): id is string => id != null)),
    ];
    const staffNameMap = new Map<string, string>();

    if (staffIds.length > 0) {
      const { data: profiles } = await client
        .from("profiles")
        .select("staff_record_id, display_name")
        .in("staff_record_id", staffIds);

      for (const p of profiles ?? []) {
        if (p.staff_record_id) staffNameMap.set(p.staff_record_id, p.display_name ?? "Unknown");
      }
    }

    // ── 5. Fetch attachment counts + punch remarks ─────────────────────
    const exceptionIds = pageRows.map((r) => r.id);
    const attachmentCountMap = new Map<string, number>();

    if (exceptionIds.length > 0) {
      const { data: attachments } = await client
        .from("attendance_clarification_attachments")
        .select("exception_id")
        .in("exception_id", exceptionIds);

      for (const a of attachments ?? []) {
        attachmentCountMap.set(a.exception_id, (attachmentCountMap.get(a.exception_id) ?? 0) + 1);
      }
    }

    const scheduleIds = pageRows.map((r) => r.shift_schedule_id).filter(Boolean) as string[];
    const punchRemarkMap = new Map<string, string>();

    if (scheduleIds.length > 0) {
      const { data: punches } = await client
        .from("timecard_punches")
        .select("shift_schedule_id, remark")
        .in("shift_schedule_id", scheduleIds)
        .not("remark", "is", null)
        .is("voided_at", null);

      for (const p of punches ?? []) {
        if (p.remark && p.shift_schedule_id) {
          punchRemarkMap.set(p.shift_schedule_id, p.remark);
        }
      }
    }

    // ── 6. Map rows ────────────────────────────────────────────────────
    let rows: DiscrepancyQueueRow[] = pageRows.map((r) => {
      const schedule = r.shift_schedules as unknown as {
        shift_date: string;
        expected_start_time: string | null;
        expected_end_time: string | null;
        shift_types: { name: string; code: string };
      };

      return {
        id: r.id,
        shiftScheduleId: r.shift_schedule_id ?? "",
        staffRecordId: r.staff_record_id ?? "",
        staffName: staffNameMap.get(r.staff_record_id ?? "") ?? "Unknown",
        shiftDate: schedule.shift_date ?? "",
        shiftTime: `${schedule.expected_start_time ?? ""} – ${schedule.expected_end_time ?? ""}`,
        type: r.type,
        status: r.status,
        detail: r.detail ?? null,
        staffClarification: r.staff_clarification ?? null,
        hrNote: r.hr_note ?? null,
        punchRemark: punchRemarkMap.get(r.shift_schedule_id ?? "") ?? null,
        clarificationSubmittedAt: r.clarification_submitted_at ?? null,
        reviewedAt: r.reviewed_at ?? null,
        createdAt: r.created_at ?? "",
        attachmentCount: attachmentCountMap.get(r.id) ?? 0,
      };
    });

    // Client-side search (name is resolved post-fetch)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) => r.staffName.toLowerCase().includes(q) || r.type.toLowerCase().includes(q),
      );
    }

    // ── 7. KPIs ────────────────────────────────────────────────────────
    // Oldest is across ALL pending_review, not just current page.
    // For the page-scoped SLA indicator, we compute from the current page
    // which contains the oldest items (FIFO sort).
    const now = Date.now();
    let oldestMs: number | null = null;
    for (const r of rows) {
      if (r.clarificationSubmittedAt) {
        const ms = now - new Date(r.clarificationSubmittedAt).getTime();
        if (oldestMs === null || ms > oldestMs) oldestMs = ms;
      }
    }

    const kpis: DiscrepancyQueueKpis = {
      awaitingReview: totalCountRes.count ?? rows.length,
      oldestHoursAgo: oldestMs !== null ? Math.round(oldestMs / 3_600_000) : null,
    };

    // ── 8. Next cursor ─────────────────────────────────────────────────
    const lastRow = hasNext ? pageRows[pageRows.length - 1] : null;
    const nextCursor =
      lastRow?.clarification_submitted_at && lastRow?.id
        ? { submittedAt: lastRow.clarification_submitted_at, id: lastRow.id }
        : null;

    return {
      rows,
      kpis,
      leaveTypes: (leaveTypesRes.data ?? []).map((lt) => ({
        id: lt.id,
        name: lt.name,
        code: lt.code,
      })),
      nextCursor,
    };
  },
);
