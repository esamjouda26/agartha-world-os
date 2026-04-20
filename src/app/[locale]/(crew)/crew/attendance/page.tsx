import type { Metadata } from "next";
import { format } from "date-fns";

import { AttendancePage } from "@/components/shared/attendance-page";

/**
 * `/crew/attendance` — thin wrapper over the shared `AttendancePage`
 * (frontend_spec.md §6 Pattern A). The shared component owns all data
 * fetching and RBAC scoping; this file only declares route-level config.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const today = format(new Date(), "EEE, MMM d yyyy");
  return {
    title: `Attendance — ${today}`,
    description:
      "Record your clock-in and clock-out, review attendance exceptions, and check your monthly stats.",
  };
}

export default async function CrewAttendancePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; date?: string; month?: string }>;
}>) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  return <AttendancePage locale={locale} searchParams={sp} />;
}
