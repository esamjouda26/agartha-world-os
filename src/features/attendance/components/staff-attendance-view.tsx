import "server-only";

import { format } from "date-fns";

import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { PageHeader } from "@/components/ui/page-header";
import { isValidIsoDate, monthStartIsoLocal, parseIsoDateLocal, todayIsoLocal } from "@/lib/date";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AttendanceDashboard } from "@/features/attendance/components/attendance-dashboard";
import { getMonthlyPunches } from "@/features/attendance/queries/get-monthly-punches";
import { getMonthlyStats } from "@/features/attendance/queries/get-monthly-stats";
import { getOwnExceptions } from "@/features/attendance/queries/get-own-exceptions";
import { getTodayShift } from "@/features/attendance/queries/get-today-shift";

/**
 * Parametrized attendance renderer — the Pattern-C surface documented in
 * ADR-0005. Accepts a `staffRecordId` prop so the same component can
 * render: the authenticated user's own attendance (via the self-resolving
 * `<AttendancePage>` wrapper), a subordinate's attendance from a future
 * admin drill-down, a hover-preview mini-card, etc.
 *
 * RLS on `timecard_punches` / `attendance_exceptions` / `v_shift_attendance`
 * enforces row-level access — passing a foreign `staffRecordId` cannot
 * expose data the caller is not entitled to see.
 *
 * Currently fetches the full "default" dataset; the optional `density`
 * prop is reserved for the compact-embed variant landing in a future
 * session (hover previews, Slack cards, email renderers).
 */

export type AttendanceSearchParams = Readonly<{
  tab?: string;
  date?: string;
  month?: string;
}>;

export type StaffAttendanceViewProps = Readonly<{
  /** Identity the view is rendered for. RLS still gates the actual data. */
  staffRecordId: string;
  /** Used in the page header eyebrow + greeting. */
  displayName: string;
  /**
   * Whether the caller can submit punches / clarifications. Defaults true
   * for self-view; future admin-view surfaces pass false to render
   * read-only chrome.
   */
  canWrite?: boolean;
  searchParams: AttendanceSearchParams;
  locale: string;
  /** Reserved: `"compact"` drives the hover-preview variant. Unused today. */
  density?: "default" | "compact";
}>;

export async function StaffAttendanceView({
  staffRecordId,
  displayName,
  canWrite = true,
  searchParams,
  density = "default",
}: StaffAttendanceViewProps) {
  const supabase = await createSupabaseServerClient();

  // All ISO date-only strings are produced / consumed via `src/lib/date.ts`
  // helpers so URL → server → client round-trips cannot drift by a day.
  const todayIso = todayIsoLocal();
  const selectedDateIso = isValidIsoDate(searchParams.date) ? searchParams.date : todayIso;
  const monthIso = isValidIsoDate(searchParams.month)
    ? monthStartIsoLocal(searchParams.month)
    : monthStartIsoLocal(todayIso);

  const [shift, exceptions, stats, punches] = await Promise.all([
    getTodayShift(supabase, staffRecordId, selectedDateIso),
    getOwnExceptions(supabase, staffRecordId),
    getMonthlyStats(supabase, staffRecordId, monthIso),
    getMonthlyPunches(supabase, staffRecordId, monthIso),
  ]);

  const eyebrow =
    selectedDateIso === todayIso
      ? "Today · Attendance"
      : `${format(parseIsoDateLocal(selectedDateIso), "MMM d")} · Attendance`;

  const description = canWrite
    ? "Clock in, review exceptions, and track your monthly pattern."
    : "Attendance history · read only.";

  // Compact density will branch the renderer in a future session (hover
  // previews, embeds). For now, always render the full dashboard.
  if (density === "compact") {
    return (
      <AttendanceDashboard
        displayName={displayName}
        canWrite={canWrite}
        staffRecordId={staffRecordId}
        shift={shift}
        todayIso={todayIso}
        selectedDateIso={selectedDateIso}
        exceptions={exceptions}
        stats={stats}
        punches={punches}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={eyebrow}
        title={`Hi, ${firstName(displayName)}.`}
        description={description}
        data-testid="attendance-page-header"
      />
      <AttendanceDashboard
        displayName={displayName}
        canWrite={canWrite}
        staffRecordId={staffRecordId}
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

/** First-token extraction — lets the header read "Hi, Alex." even when
 *  `display_name` is "Alex Chen" or "Alex · Head of Front-of-House". */
function firstName(full: string): string {
  const token = full.trim().split(/[\s·|-]+/)[0];
  return token || full;
}

// Re-export the EmptyState helper the wrapper uses when a caller has no
// linked staff record. Keeping this symbol in the feature folder means
// the thin `AttendancePage` wrapper in `src/components/shared/` doesn't
// need to import page-chrome primitives directly.
export function StaffRecordNotLinkedEmptyState() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        description="Clock in, review exceptions, and check your monthly stats."
        data-testid="attendance-page-header"
      />
      <EmptyStateCta
        variant="first-use"
        title="Staff record not linked"
        description="Your profile isn't linked to an employee record yet. Contact HR so your shifts, clock actions, and exceptions can appear here."
        data-testid="attendance-no-staff-record"
      />
    </div>
  );
}
