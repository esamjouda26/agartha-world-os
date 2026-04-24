import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AttendancePage,
  StaffRecordNotLinkedEmptyState,
} from "@/components/shared/attendance-page";

/**
 * `/admin/attendance` — Pattern C route wrapper (ADR-0005 / ADR-0007).
 *
 * Resolves the authenticated admin's own staff context server-side, then
 * injects `staffRecordId` and `displayName` as explicit props into the
 * shared `AttendancePage`. The shared component never reads the JWT itself.
 *
 * Domain gate: middleware `SHARED_BYPASS_PREFIXES` exempts `/admin/attendance`
 * from Gate 5 — inner RLS + the `hr:c` nav requirement enforce access.
 * For drill-down to another staff member's attendance, the caller injects
 * a different `staffRecordId`; RLS remains the security boundary (ADR-0005).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const today = format(new Date(), "EEE, MMM d yyyy");
  return {
    title: `Attendance — ${today} · Admin`,
    description: "View your attendance record, clock-in/out history, and monthly stats.",
  };
}

export default async function AdminAttendancePage({
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
      displayName={profile.display_name ?? "Admin"}
      locale={locale}
      searchParams={sp}
    />
  );
}
