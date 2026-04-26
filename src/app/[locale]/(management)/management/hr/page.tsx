import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffList } from "@/features/hr/queries/get-staff-list";
import { StaffListView } from "@/features/hr/components/staff-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Staff Management · HR",
    description: "Manage staff records, view org chart, and initiate new hires.",
  };
}

export default async function ManagementHrPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Extract domain access for hr
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  const canWrite = hrAccess.includes("c") || hrAccess.includes("u");

  // Parallel fetches: staff list + org units for filters/forms
  const [staffData, orgUnitsResult] = await Promise.all([
    getStaffList(supabase),
    supabase
      .from("org_units")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const orgUnits = (orgUnitsResult.data ?? []).map((ou) => ({
    id: ou.id,
    name: ou.name,
  }));

  return <StaffListView data={staffData} canWrite={canWrite} orgUnits={orgUnits} locale={locale} />;
}
