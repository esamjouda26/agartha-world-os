import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { ScheduleOverviewPage, ScheduleOverviewRow } from "@/features/hr/types/shifts";
import {
  decodeShiftCursor,
  SHIFT_OVERVIEW_DEFAULT_PAGE_SIZE,
  type ShiftOverviewFilters,
} from "@/features/hr/schemas/shift-overview-filters";

/**
 * Fetch one keyset-paginated page of shift_schedules, ordered by
 * shift_date ASC, id ASC. Cursor encodes the last row of the previous
 * page as `<shift_date>|<id>`.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * RLS-scoped read → `unstable_cache` is off-limits.
 */
export const listScheduleOverview = cache(
  async (
    client: SupabaseClient<Database>,
    filters: ShiftOverviewFilters,
  ): Promise<ScheduleOverviewPage> => {
    const cursor = decodeShiftCursor(filters.cursor);
    const pageSize = filters.pageSize ?? SHIFT_OVERVIEW_DEFAULT_PAGE_SIZE;

    // Staff name search: resolve matching staff_record IDs first so we
    // can filter the shift_schedules table directly (PostgREST doesn't
    // support ilike on embedded resource columns).
    let staffIdFilter: string[] | null = null;
    if (filters.staffSearch) {
      const { data: staffRows } = await client
        .from("staff_records")
        .select("id")
        .ilike("legal_name", `%${filters.staffSearch}%`);
      staffIdFilter = (staffRows ?? []).map((r) => r.id);
      if (staffIdFilter.length === 0) {
        return { rows: [], nextCursor: null, hasPrev: false, totalShifts: 0, overridesCount: 0 };
      }
    }

    // ── Count queries (parallel with main) ────────────────────────────
    // Total rows matching all filters (no cursor, no limit).
    let countQ = client.from("shift_schedules").select("*", { count: "exact", head: true });
    if (staffIdFilter) countQ = countQ.in("staff_record_id", staffIdFilter);
    if (filters.shiftTypeId) countQ = countQ.eq("shift_type_id", filters.shiftTypeId);
    if (filters.override === "true") countQ = countQ.eq("is_override", true);
    if (filters.from) countQ = countQ.gte("shift_date", filters.from);
    if (filters.to) countQ = countQ.lte("shift_date", filters.to);

    // Override count: same filters + is_override = true (no cursor).
    let overrideCountQ = client
      .from("shift_schedules")
      .select("*", { count: "exact", head: true })
      .eq("is_override", true);
    if (staffIdFilter) overrideCountQ = overrideCountQ.in("staff_record_id", staffIdFilter);
    if (filters.shiftTypeId)
      overrideCountQ = overrideCountQ.eq("shift_type_id", filters.shiftTypeId);
    if (filters.from) overrideCountQ = overrideCountQ.gte("shift_date", filters.from);
    if (filters.to) overrideCountQ = overrideCountQ.lte("shift_date", filters.to);

    // ── Main paginated query ───────────────────────────────────────────
    let mainQ = client
      .from("shift_schedules")
      .select(
        `id, staff_record_id, shift_date, shift_type_id, expected_start_time, expected_end_time,
         is_override, override_reason,
         shift_types ( name ),
         staff_records ( legal_name, profiles ( display_name ) )`,
      )
      .order("shift_date", { ascending: true })
      .order("id", { ascending: true })
      .limit(pageSize + 1); // +1 to detect "has next"

    if (staffIdFilter) mainQ = mainQ.in("staff_record_id", staffIdFilter);
    if (filters.shiftTypeId) mainQ = mainQ.eq("shift_type_id", filters.shiftTypeId);
    if (filters.override === "true") mainQ = mainQ.eq("is_override", true);
    if (filters.from) mainQ = mainQ.gte("shift_date", filters.from);
    if (filters.to) mainQ = mainQ.lte("shift_date", filters.to);

    // Keyset cursor (ASC): next page = rows strictly after (shiftDate, id).
    if (cursor) {
      mainQ = mainQ.or(
        `shift_date.gt.${cursor.shiftDate},and(shift_date.eq.${cursor.shiftDate},id.gt.${cursor.id})`,
      );
    }

    const [countRes, overrideCountRes, mainRes] = await Promise.all([
      countQ,
      overrideCountQ,
      mainQ,
    ]);

    if (countRes.error) throw countRes.error;
    if (overrideCountRes.error) throw overrideCountRes.error;
    if (mainRes.error) throw mainRes.error;

    const raw = mainRes.data ?? [];
    const hasNext = raw.length > pageSize;
    const pageRows = hasNext ? raw.slice(0, pageSize) : raw;

    const rows: ScheduleOverviewRow[] = pageRows.map((s) => {
      const sr = s.staff_records as unknown as {
        legal_name: string;
        profiles: { display_name: string | null } | null;
      } | null;
      const st = s.shift_types as { name: string } | null;
      return {
        id: s.id,
        staffRecordId: s.staff_record_id,
        staffName: sr?.profiles?.display_name ?? sr?.legal_name ?? "Unknown",
        shiftDate: s.shift_date,
        shiftTypeName: st?.name ?? "Unknown",
        expectedStartTime: s.expected_start_time,
        expectedEndTime: s.expected_end_time,
        isOverride: s.is_override,
        overrideReason: s.override_reason,
      };
    });

    const lastRow = hasNext ? pageRows[pageRows.length - 1] : null;
    const nextCursor = lastRow ? { shiftDate: lastRow.shift_date, id: lastRow.id } : null;

    return {
      rows,
      nextCursor,
      hasPrev: cursor !== null,
      totalShifts: countRes.count ?? 0,
      overridesCount: overrideCountRes.count ?? 0,
    };
  },
);
