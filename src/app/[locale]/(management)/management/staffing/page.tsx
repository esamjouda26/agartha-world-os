import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ActiveStaffGrid } from "@/components/shared/active-staff-grid";
import { listActiveStaff } from "@/features/staffing/queries/list-active-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `/management/staffing` — Pattern C route wrapper. Resolves active-
 * staff rows server-side via `rpc_get_active_staff()` and injects
 * them into the shared `<ActiveStaffGrid>`.
 *
 * Gate-5 on `reports:r` via `src/features/staffing/rbac.ts` — every
 * manager + admin, no crew.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Active staff · Management",
  description: "Live view of every staff member currently on the floor.",
};

export default async function ManagementStaffingPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const rows = await listActiveStaff();

  return <ActiveStaffGrid rows={rows} />;
}
