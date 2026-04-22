import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AttendancePage,
  StaffRecordNotLinkedEmptyState,
} from "@/components/shared/attendance-page";

/**
 * `/crew/attendance` — Pattern C route wrapper (ADR-0005 / ADR-0007).
 *
 * Resolves the authenticated user's identity and staff context
 * server-side, then injects `staffRecordId` and `displayName`
 * as explicit props into the shared `AttendancePage` component.
 * The shared component never reads the JWT itself.
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

  // ── Server-side context resolution (Pattern C) ────────────────
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

  // ── Inject resolved context as explicit props ─────────────────
  return (
    <AttendancePage
      staffRecordId={profile.staff_record_id}
      displayName={profile.display_name ?? "Staff"}
      locale={locale}
      searchParams={sp}
    />
  );
}
