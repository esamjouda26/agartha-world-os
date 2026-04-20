import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { ExceptionRow } from "@/features/attendance/types";

/**
 * Tab-2 loader — own exceptions joined with shift_schedule + shift_type for
 * display context, plus the clock-in punch remark per WF-5.
 *
 * Sort contract from frontend_spec.md:4238: unjustified first, then
 * created_at DESC within each group. Encoded as two `.order()` calls in
 * priority order.
 */
export const getOwnExceptions = cache(
  async (
    client: SupabaseClient<Database>,
    staffRecordId: string,
  ): Promise<ReadonlyArray<ExceptionRow>> => {
    const { data, error } = await client
      .from("attendance_exceptions")
      .select(
        `id, type, status, detail, staff_clarification, justification_reason, created_at,
         shift_schedule:shift_schedules!inner (
           shift_date,
           shift_type:shift_types!inner ( name, code )
         )`,
      )
      .eq("staff_record_id", staffRecordId)
      // Explicit .throwOnError() would mask the pagination intent; keep manual branch.
      .order("status", { ascending: false }) // "unjustified" > "justified" lexicographically
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Punch remark is pulled in a single follow-up query keyed by the set of
    // schedule ids — avoids N+1 (prompt.md "Aggregate Queries" / §Performance
    // Boundaries). Single IN projection is O(|exceptions|) in one round-trip.
    const scheduleIds = Array.from(
      new Set(
        data.map((row) => (row.shift_schedule as { id?: string } | null)?.id).filter(Boolean),
      ),
    ) as string[];

    const remarkByScheduleId = new Map<string, string | null>();
    if (scheduleIds.length > 0) {
      const { data: remarkRows, error: remarkErr } = await client
        .from("timecard_punches")
        .select("shift_schedule_id, remark, punch_type")
        .in("shift_schedule_id", scheduleIds)
        .eq("punch_type", "clock_in")
        .is("voided_at", null);

      if (remarkErr) throw remarkErr;
      for (const row of remarkRows ?? []) {
        remarkByScheduleId.set(row.shift_schedule_id, row.remark ?? null);
      }
    }

    return data.map((row) => {
      const shiftSchedule = row.shift_schedule as {
        id: string;
        shift_date: string;
        shift_type: { name: string | null; code: string | null } | null;
      } | null;
      return {
        id: row.id,
        shift_date: shiftSchedule?.shift_date ?? "",
        shift_type_name: shiftSchedule?.shift_type?.name ?? null,
        shift_type_code: shiftSchedule?.shift_type?.code ?? null,
        type: row.type,
        status: row.status,
        detail: row.detail ?? null,
        punch_remark: shiftSchedule ? (remarkByScheduleId.get(shiftSchedule.id) ?? null) : null,
        staff_clarification: row.staff_clarification ?? null,
        justification_reason: row.justification_reason ?? null,
        created_at: row.created_at,
      } satisfies ExceptionRow;
    });
  },
);
