import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgUnits, buildOrgUnitTree } from "@/features/org-units/queries/get-org-units";
import { OrgUnitPageView } from "@/features/org-units/components/org-unit-page-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Org Units · Admin",
    description: "Manage the organizational hierarchy tree that scopes data access.",
  };
}

export default async function AdminOrgUnitsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const systemAccess = appMeta.domains?.system ?? [];
  const canWrite = systemAccess.includes("c") || systemAccess.includes("u");

  const rows = await getOrgUnits(supabase);
  const tree = buildOrgUnitTree(rows);

  return <OrgUnitPageView rows={rows} tree={tree} canWrite={canWrite} />;
}
