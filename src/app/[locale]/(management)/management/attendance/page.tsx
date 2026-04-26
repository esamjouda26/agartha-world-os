import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AttendancePage,
  StaffRecordNotLinkedEmptyState,
} from "@/components/shared/attendance-page";

/**
 * `/management/attendance` — Pattern C route wrapper (ADR-0005 / ADR-0007).
 *
 * Mirrors `/admin/attendance` and `/crew/attendance`: resolves the
 * authenticated manager's own staff context server-side, then injects
 * `staffRecordId` and `displayName` as explicit props into the shared
 * `<AttendancePage>`. The shared component never reads the JWT itself.
 *
 * Domain gate: middleware `SHARED_BYPASS_PREFIXES` exempts
 * `/management/attendance` from Gate 5 — inner RLS plus the `hr:c` nav
 * requirement (`src/features/attendance/nav.ts`) enforce access.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const today = format(new Date(), "EEE, MMM d yyyy");
  return {
    title: `Attendance — ${today} · Management`,
    description: "View your attendance record, clock-in/out history, and monthly stats.",
  };
}

export default async function ManagementAttendancePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; date?: string; month?: string }>;
}>) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("display_name, staff_record_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) throw profileErr;

  if (!profile?.staff_record_id) {
    return <StaffRecordNotLinkedEmptyState />;
  }

  return (
    <AttendancePage
      staffRecordId={profile.staff_record_id}
      displayName={profile.display_name ?? "Manager"}
      locale={locale}
      searchParams={sp}
    />
  );
}
