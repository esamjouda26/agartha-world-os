import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUnits } from "@/features/units/queries/get-units";
import { UnitsPageView } from "@/features/units/components/units-page-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Units of Measure · Admin",
    description: "Manage units of measure referenced across materials, procurement, and inventory.",
  };
}

export default async function AdminUnitsPage({
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

  const units = await getUnits(supabase);

  return <UnitsPageView units={units} canWrite={canWrite} />;
}
