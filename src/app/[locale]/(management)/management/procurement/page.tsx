import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMaterialsList } from "@/features/procurement/queries/get-materials-list";
import { MaterialsListView } from "@/features/procurement/components/materials-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Materials · Procurement",
    description:
      "Master material registry — manage all materials with supplier and unit data.",
  };
}

export default async function ManagementProcurementPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Extract domain access for procurement
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const procAccess = appMeta.domains?.procurement ?? [];
  const posAccess = appMeta.domains?.pos ?? [];
  const canWrite =
    procAccess.includes("c") ||
    procAccess.includes("u") ||
    posAccess.includes("c") ||
    posAccess.includes("u");

  // Parallel fetches: materials list + units for forms
  const [materialsData, unitsResult] = await Promise.all([
    getMaterialsList(supabase),
    supabase
      .from("units")
      .select("id, name, abbreviation")
      .order("name", { ascending: true }),
  ]);

  const units = (unitsResult.data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    abbreviation: u.abbreviation,
  }));

  return (
    <MaterialsListView
      data={materialsData}
      canWrite={canWrite}
      units={units}
      locale={locale}
    />
  );
}
