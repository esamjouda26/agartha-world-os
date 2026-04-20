import "server-only";

import { cache } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Monthly punches loader for the My Attendance tab.
 *
 * Pulls every non-voided punch the caller owns in the selected month,
 * grouped by shift_date so the panel can render a day-by-day log that
 * surfaces the remark the user attached at punch time (spec §6: the
 * user should see *their* note, not a separate clarification).
 */

export type MonthlyPunchRow = Readonly<{
  id: string;
  shift_date: string;
  punch_type: "clock_in" | "clock_out";
  punch_time: string;
  source: "mobile" | "kiosk" | "manual";
  remark: string | null;
  shift_type_name: string | null;
  shift_type_code: string | null;
}>;

export type MonthlyPunchesByDay = Readonly<{
  day: string;
  shift_type_name: string | null;
  shift_type_code: string | null;
  punches: ReadonlyArray<MonthlyPunchRow>;
}>;

export const getMonthlyPunches = cache(
  async (
    client: SupabaseClient<Database>,
    staffRecordId: string,
    monthIso: string,
  ): Promise<ReadonlyArray<MonthlyPunchesByDay>> => {
    const anchor = parseISO(monthIso);
    const monthStart = format(startOfMonth(anchor), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(anchor), "yyyy-MM-dd");

    const { data, error } = await client
      .from("timecard_punches")
      .select(
        `id, punch_type, punch_time, source, remark,
         shift_schedule:shift_schedules!inner (
           shift_date,
           shift_type:shift_types!inner ( name, code )
         )`,
      )
      .eq("staff_record_id", staffRecordId)
      .is("voided_at", null)
      .gte("punch_time", `${monthStart}T00:00:00Z`)
      .lte("punch_time", `${monthEnd}T23:59:59Z`)
      .order("punch_time", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Group by shift_date. The join yields `shift_schedule` nested; we
    // pull the date (and type name/code) from there. Sort within each day
    // ascending so clock_in precedes clock_out in reading order.
    const byDay = new Map<string, MonthlyPunchesByDay & { punches: MonthlyPunchRow[] }>();
    for (const row of data) {
      const schedule = row.shift_schedule as {
        shift_date?: string;
        shift_type?: { name: string | null; code: string | null } | null;
      } | null;
      const day = schedule?.shift_date ?? "";
      if (!day) continue;
      const typedRow: MonthlyPunchRow = {
        id: row.id,
        shift_date: day,
        punch_type: row.punch_type,
        punch_time: row.punch_time,
        source: row.source,
        remark: row.remark ?? null,
        shift_type_name: schedule?.shift_type?.name ?? null,
        shift_type_code: schedule?.shift_type?.code ?? null,
      };
      const bucket = byDay.get(day) ?? {
        day,
        shift_type_name: typedRow.shift_type_name,
        shift_type_code: typedRow.shift_type_code,
        punches: [],
      };
      bucket.punches.push(typedRow);
      byDay.set(day, bucket);
    }

    return Array.from(byDay.values())
      .map((entry) => ({
        ...entry,
        punches: entry.punches.sort((a, b) => a.punch_time.localeCompare(b.punch_time)),
      }))
      .sort((a, b) => b.day.localeCompare(a.day));
  },
);
