import "server-only";

import { cache } from "react";
import {
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { MonthlyStats, WeeklyBreakdownRow } from "@/features/attendance/types";

/**
 * Tab-3 loader — monthly stats from `v_shift_attendance` scoped to own
 * staff_record + shift_date within the month (frontend_spec.md:4242 requires
 * month-range predicate, not full-view scan).
 *
 * Aggregation happens in-memory over the scoped view result set (~30 rows per
 * month); a SQL MVCC aggregate would require another view + RLS rewrite that
 * the schema doesn't currently ship. If the row count grows beyond "one
 * person-month" this should migrate to a SECURITY DEFINER RPC.
 */
export const getMonthlyStats = cache(
  async (
    client: SupabaseClient<Database>,
    staffRecordId: string,
    monthIso: string,
  ): Promise<MonthlyStats> => {
    const anchor = parseISO(monthIso);
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);

    const { data, error } = await client
      .from("v_shift_attendance")
      .select(
        "shift_date, derived_status, gross_worked_seconds, net_worked_seconds, first_in, last_out, expected_start_time, expected_end_time, has_unjustified",
      )
      .eq("staff_record_id", staffRecordId)
      .gte("shift_date", format(monthStart, "yyyy-MM-dd"))
      .lte("shift_date", format(monthEnd, "yyyy-MM-dd"))
      .order("shift_date", { ascending: true });

    if (error) throw error;

    let daysWorked = 0;
    let daysAbsent = 0;
    let daysOnLeave = 0;
    let grossSeconds = 0;
    let netSeconds = 0;
    let lateMinutes = 0;
    let earlyMinutes = 0;
    let unjustifiedCount = 0;

    type Bucket = { gross: number; late: number; worked: number };
    const byWeek = new Map<string, Bucket>();

    for (const row of data ?? []) {
      if (!row.shift_date) continue;
      if (row.derived_status === "completed" || row.derived_status === "in_progress")
        daysWorked += 1;
      if (row.derived_status === "absent") daysAbsent += 1;
      if (row.derived_status === "on_leave") daysOnLeave += 1;

      if (row.gross_worked_seconds) grossSeconds += row.gross_worked_seconds;
      if (row.net_worked_seconds) netSeconds += row.net_worked_seconds;
      if (row.has_unjustified) unjustifiedCount += 1;

      if (row.first_in && row.expected_start_time) {
        const expected = combineDateAndTime(row.shift_date, row.expected_start_time);
        const actual = parseISO(row.first_in);
        const delta = differenceInMinutes(actual, expected);
        if (delta > 0) lateMinutes += delta;
      }
      if (row.last_out && row.expected_end_time) {
        const expected = combineDateAndTime(row.shift_date, row.expected_end_time);
        const actual = parseISO(row.last_out);
        const delta = differenceInMinutes(expected, actual);
        if (delta > 0) earlyMinutes += delta;
      }

      const weekStart = startOfWeek(parseISO(row.shift_date), { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      const bucket: Bucket = byWeek.get(key) ?? { gross: 0, late: 0, worked: 0 };
      bucket.gross += row.gross_worked_seconds ?? 0;
      if (row.derived_status === "completed" || row.derived_status === "in_progress") {
        bucket.worked += 1;
      }
      if (row.first_in && row.expected_start_time) {
        const expected = combineDateAndTime(row.shift_date, row.expected_start_time);
        const actual = parseISO(row.first_in);
        const delta = differenceInMinutes(actual, expected);
        if (delta > 0) bucket.late += delta;
      }
      byWeek.set(key, bucket);
    }

    const weekly: WeeklyBreakdownRow[] = Array.from(byWeek.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, bucket]) => {
        const weekStartDate = parseISO(weekStart);
        return {
          week_start: format(weekStartDate, "yyyy-MM-dd"),
          week_end: format(endOfWeek(weekStartDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          days_worked: bucket.worked,
          gross_hours: roundToHours(bucket.gross),
          late_minutes: bucket.late,
        };
      });

    return {
      month_start: format(monthStart, "yyyy-MM-dd"),
      month_end: format(monthEnd, "yyyy-MM-dd"),
      days_worked: daysWorked,
      days_absent: daysAbsent,
      days_on_leave: daysOnLeave,
      gross_hours: roundToHours(grossSeconds),
      net_hours: roundToHours(netSeconds),
      late_minutes: lateMinutes,
      early_departure_minutes: earlyMinutes,
      unjustified_exception_count: unjustifiedCount,
      weekly_breakdown: weekly,
    } satisfies MonthlyStats;
  },
);

function combineDateAndTime(dateIso: string, timeIso: string): Date {
  // `expected_start_time` comes back as a `TIME` value formatted "HH:MM:SS".
  const date = parseISO(dateIso);
  const [h, m, s] = timeIso.split(":").map(Number);
  date.setHours(h ?? 0, m ?? 0, s ?? 0, 0);
  return date;
}

function roundToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}
