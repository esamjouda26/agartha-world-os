import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type ScheduleDay = Readonly<{
  shiftDate: string;
  shiftTypeName: string | null;
  startTime: string | null;
  endTime: string | null;
  isOffDay: boolean;
  isOnLeave: boolean;
}>;

export type MyScheduleData = Readonly<{
  staffRecordId: string;
  locationName: string | null;
  days: ReadonlyArray<ScheduleDay>;
}>;

/**
 * Fetch the caller's weekly schedule.
 * init_schema.sql:1589 — shift_schedules; init_schema.sql:1560 — leave_requests.
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 *
 * NOTE: coworker data intentionally excluded — crew members see only their
 * own schedule. Coworker visibility is a management-level concern handled
 * by `list-schedule-overview.ts`.
 */
export const getMySchedule = cache(
  async (
    client: SupabaseClient<Database>,
    userId: string,
    weekStart: string,
    weekEnd: string,
  ): Promise<MyScheduleData | null> => {
    const { data: profile } = await client
      .from("profiles")
      .select("staff_record_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.staff_record_id) return null;

    // Parallel fetch: shifts + leaves + staff record (for location)
    const [shiftsResult, leavesResult, staffResult] = await Promise.all([
      // Shifts for the week
      client
        .from("shift_schedules")
        .select("shift_date, shift_types(name, start_time, end_time)")
        .eq("staff_record_id", profile.staff_record_id)
        .gte("shift_date", weekStart)
        .lte("shift_date", weekEnd)
        .order("shift_date"),

      // Approved leaves overlapping the week
      client
        .from("leave_requests")
        .select("start_date, end_date")
        .eq("staff_record_id", profile.staff_record_id)
        .eq("status", "approved")
        .lte("start_date", weekEnd)
        .gte("end_date", weekStart),

      // Staff record for location lookup
      client
        .from("staff_records")
        .select("org_unit_id")
        .eq("id", profile.staff_record_id)
        .maybeSingle(),
    ]);

    if (shiftsResult.error) throw shiftsResult.error;
    const shifts = shiftsResult.data;
    const leaves = leavesResult.data;
    const staffRec = staffResult.data;

    // Build leave date set
    const leaveSet = new Set<string>();
    for (const leave of leaves ?? []) {
      let d = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      while (d <= end) {
        leaveSet.add(d.toISOString().slice(0, 10));
        d = new Date(d.getTime() + 86_400_000);
      }
    }

    // Resolve location via staff_records.org_unit_id → locations.org_unit_id
    let locationName: string | null = null;
    if (staffRec?.org_unit_id) {
      const { data: loc } = await client
        .from("locations")
        .select("name")
        .eq("org_unit_id", staffRec.org_unit_id)
        .maybeSingle();
      locationName = loc?.name ?? null;
    }

    // Build one ScheduleDay per date in range
    const days: ScheduleDay[] = [];
    let cursor = new Date(weekStart);
    const endDate = new Date(weekEnd);
    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const shift = shifts?.find((s) => s.shift_date === dateStr);
      const shiftType = shift?.shift_types as {
        name: string;
        start_time: string;
        end_time: string;
      } | null;
      days.push({
        shiftDate: dateStr,
        shiftTypeName: shiftType?.name ?? null,
        startTime: shiftType?.start_time ?? null,
        endTime: shiftType?.end_time ?? null,
        isOffDay: !shift,
        isOnLeave: leaveSet.has(dateStr),
      });
      cursor = new Date(cursor.getTime() + 86_400_000);
    }

    return { staffRecordId: profile.staff_record_id, locationName, days };
  },
);
