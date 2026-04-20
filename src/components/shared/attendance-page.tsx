import { format, isValid, parseISO, startOfMonth } from "date-fns";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AttendanceTabs } from "@/features/attendance/components/attendance-tabs";
import { getMonthlyPunches } from "@/features/attendance/queries/get-monthly-punches";
import { getMonthlyStats } from "@/features/attendance/queries/get-monthly-stats";
import { getOwnExceptions } from "@/features/attendance/queries/get-own-exceptions";
import { getTodayShift } from "@/features/attendance/queries/get-today-shift";

type AttendanceSearchParams = Readonly<{
  tab?: string;
  date?: string;
  month?: string;
}>;

/**
 * Shared `AttendancePage` — frontend_spec.md §6 Pattern A.
 * Mounted by `/admin/attendance`, `/management/attendance`, `/crew/attendance`.
 * All data is scoped to the caller's own staff_record via Tier-4 RLS
 * ([init_schema.sql:1971](supabase/migrations/20260417064731_init_schema.sql#L1971)).
 *
 * URL params:
 *   - `?tab=clock|exceptions|stats` — which tab is open (nuqs-owned).
 *   - `?date=YYYY-MM-DD` — date for the Clock In/Out tab (history when
 *     !== today; actions only on today).
 *   - `?month=YYYY-MM-DD` — month for the My Attendance tab.
 */
export async function AttendancePage({
  locale,
  searchParams,
}: Readonly<{
  locale: string;
  searchParams?: AttendanceSearchParams;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Resolve the caller's staff_record_id. Profiles linked to staff_records
  // carry `staff_record_id`; staff that haven't been linked land on the
  // `<EmptyState variant="first-use">` below.
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("display_name, staff_record_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) throw profileErr;

  if (!profile?.staff_record_id) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Attendance"
          description="Clock in, review exceptions, and check your monthly stats."
          data-testid="attendance-page-header"
        />
        <EmptyState
          variant="first-use"
          title="Staff record not linked"
          description="Your profile isn't linked to an employee record yet. Contact HR so your shifts, clock actions, and exceptions can appear here."
          data-testid="attendance-no-staff-record"
        />
      </div>
    );
  }

  const todayIso = format(new Date(), "yyyy-MM-dd");
  const selectedDateIso = resolveIsoDate(searchParams?.date, todayIso);
  const monthIso = resolveMonthIso(searchParams?.month, todayIso);

  const [shift, exceptions, stats, punches] = await Promise.all([
    getTodayShift(supabase, profile.staff_record_id, selectedDateIso),
    getOwnExceptions(supabase, profile.staff_record_id),
    getMonthlyStats(supabase, profile.staff_record_id, monthIso),
    getMonthlyPunches(supabase, profile.staff_record_id, monthIso),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        description={`Hello, ${profile.display_name ?? user.email ?? "teammate"} — review or record your shift below.`}
        data-testid="attendance-page-header"
      />
      <AttendanceTabs
        shift={shift}
        todayIso={todayIso}
        selectedDateIso={selectedDateIso}
        exceptions={exceptions}
        stats={stats}
        punches={punches}
      />
    </div>
  );
}

function resolveIsoDate(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const parsed = parseISO(raw);
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : fallback;
}

function resolveMonthIso(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const parsed = parseISO(raw);
  return isValid(parsed) ? format(startOfMonth(parsed), "yyyy-MM-dd") : fallback;
}
