import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffDetail } from "@/features/hr/queries/get-staff-detail";
import { StaffDetailView } from "@/features/hr/components/staff-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("staff_records")
    .select("legal_name")
    .eq("id", id)
    .maybeSingle();

  return {
    title: data?.legal_name ? `${data.legal_name} · Staff Detail · HR` : "Staff Detail · HR",
    description: "View and manage staff record details, leave policy, and equipment.",
  };
}

export default async function StaffDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Extract domain access for hr
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  const canWrite = hrAccess.includes("u") || hrAccess.includes("c");

  // Parallel fetches: detail data + org units for edit form
  const [detailData, orgUnitsResult] = await Promise.all([
    getStaffDetail(supabase, id),
    supabase
      .from("org_units")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  if (!detailData) notFound();

  const orgUnits = (orgUnitsResult.data ?? []).map((ou) => ({
    id: ou.id,
    name: ou.name,
  }));

  return <StaffDetailView data={detailData} canWrite={canWrite} orgUnits={orgUnits} />;
}
