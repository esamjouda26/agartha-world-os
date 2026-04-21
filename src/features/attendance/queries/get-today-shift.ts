import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { TodayShift } from "@/features/attendance/types";

/**
 * Tab-1 loader — resolve the caller's staff_record, fetch today's schedule +
 * shift_type + non-voided punches. Named column projections only (prompt.md
 * Absolute Rule #21). Returns `null` when the caller has no shift today so
 * the UI renders `<EmptyState variant="first-use">` rather than throwing.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only. This
 * query is RLS-scoped; Next's `unstable_cache` work fn runs detached from
 * request context (no `cookies()`), which would force a service-role client
 * that bypasses RLS — unacceptable per CLAUDE.md §2 "Zero-Trust RLS".
 *
 * Cross-request invalidation after mutations is handled by the Router Cache
 * (targeted `revalidatePath` in the action), which busts the RSC payload
 * and forces this fetcher to re-run on next navigation.
 */
export const getTodayShift = cache(
  async (
    client: SupabaseClient<Database>,
    staffRecordId: string,
    today: string,
  ): Promise<TodayShift | null> => {
    const { data: schedule, error: scheduleError } = await client
      .from("shift_schedules")
      .select(
        "id, shift_date, shift_type_id, expected_start_time, expected_end_time, is_override, override_reason",
      )
      // Explicit .maybeSingle() — zero rows is a valid "no shift today" state.
      .eq("staff_record_id", staffRecordId)
      .eq("shift_date", today)
      .maybeSingle();

    if (scheduleError) throw scheduleError;
    if (!schedule) return null;

    const { data: shiftType, error: typeError } = await client
      .from("shift_types")
      .select(
        "id, code, name, start_time, end_time, grace_late_arrival_minutes, grace_early_departure_minutes, max_early_clock_in_minutes, max_late_clock_in_minutes, max_late_clock_out_minutes",
      )
      // Explicit .single() — shift_types is a 1:1 FK; missing row is a data
      // integrity violation we want to surface, not silently swallow.
      .eq("id", schedule.shift_type_id)
      .single();

    if (typeError) throw typeError;

    const { data: punches, error: punchError } = await client
      .from("timecard_punches")
      .select("id, punch_type, punch_time, source, remark")
      .eq("shift_schedule_id", schedule.id)
      .is("voided_at", null)
      .order("punch_time", { ascending: true });

    if (punchError) throw punchError;

    return {
      schedule,
      shiftType,
      punches: punches ?? [],
    };
  },
);
