import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  StaffAttendanceView,
  StaffRecordNotLinkedEmptyState,
  type AttendanceSearchParams,
} from "@/features/attendance/components/staff-attendance-view";

/**
 * Shared `AttendancePage` — the self-resolving thin wrapper.
 *
 * Historical note: originally specified as Pattern A ("no props") in
 * `frontend_spec.md §6`. Overridden by
 * [ADR-0005](docs/adr/0005-attendance-pattern-c-override.md) to enable
 * drill-down, hover previews, shareable deep-links, and future
 * admin "view-as" UX.
 *
 * Responsibility here is narrow: authenticate, resolve the caller's
 * `staff_record_id`, and delegate rendering to the parametrized
 * `<StaffAttendanceView />` (the Pattern-C renderer that accepts any
 * staffRecordId and is reused by future admin drill-down surfaces).
 *
 * RLS remains the security boundary — see ADR-0005 §"RLS contract".
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
    <StaffAttendanceView
      staffRecordId={profile.staff_record_id}
      displayName={profile.display_name ?? "Staff"}
      canWrite
      searchParams={searchParams ?? {}}
      locale={locale}
    />
  );
}
