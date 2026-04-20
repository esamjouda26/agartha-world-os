import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { TodayShift } from "@/features/attendance/types";

/**
 * Tab-1 loader — resolve the caller's staff_record, fetch today's schedule +
 * shift_type + non-voided punches. Named column projections only (prompt.md
 * Absolute Rule #21). Returns `null` when the caller has no shift today so the
 * UI renders `<EmptyState variant="first-use">` rather than throwing.
 *
 * Precedence note: frontend_spec.md §6 AttendancePage Tab-1 references the
 * same tables + fields — we project only the columns the Client leaf consumes.
 *
 * Wrapped in `cache()` so RSC tree dedupes repeated calls within a single
 * request (no React Query on the server side of the initial render).
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
