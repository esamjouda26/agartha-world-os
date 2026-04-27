import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  addWeeks,
  endOfISOWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
} from "date-fns";

import { WeekScheduleView } from "@/features/hr/components/week-schedule-view";
import { getMySchedule } from "@/features/hr/queries/get-my-schedule";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "My Schedule" };
}

/** Parse "YYYY-Wnn" to the Monday of that ISO week. Returns today's Monday on invalid input. */
function parseISOWeekParam(weekStr: string | undefined): Date {
  if (!weekStr) return startOfISOWeek(new Date());
  const match = /^(\d{4})-W(\d{2})$/.exec(weekStr);
  if (!match || match[1] === undefined || match[2] === undefined) {
    return startOfISOWeek(new Date());
  }
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  const jan4 = new Date(year, 0, 4);
  const weekOneMonday = startOfISOWeek(jan4);
  return addWeeks(weekOneMonday, week - 1);
}

function formatISOWeek(date: Date): string {
  const year = getISOWeekYear(date);
  const week = String(getISOWeek(date)).padStart(2, "0");
  return `${year}-W${week}`;
}

export default async function CrewSchedulePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ week?: string }>;
}>) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const weekDate = parseISOWeekParam(sp.week);
  const weekStart = format(startOfISOWeek(weekDate), "yyyy-MM-dd");
  const weekEnd = format(endOfISOWeek(weekDate), "yyyy-MM-dd");
  const currentWeek = formatISOWeek(weekDate);
  const weekLabel = `${format(startOfISOWeek(weekDate), "MMM d")} – ${format(endOfISOWeek(weekDate), "MMM d, yyyy")}`;

  const scheduleData = await getMySchedule(supabase, user.id, weekStart, weekEnd);

  return (
    <WeekScheduleView initialData={scheduleData} currentWeek={currentWeek} weekLabel={weekLabel} />
  );
}
