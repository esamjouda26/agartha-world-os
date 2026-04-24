import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCostsDashboard,
  resolvePeriodBounds,
} from "@/features/costs/queries/get-costs-dashboard";
import { CostsDashboardView } from "@/features/costs/components/costs-dashboard-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cost & Waste · Admin",
    description: "Inventory value, COGS, waste analysis, and stock composition.",
  };
}

export default async function AdminCostsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { locale } = await params;
  const sp = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const bounds = resolvePeriodBounds({
    range: typeof sp.range === "string" ? sp.range : null,
  });

  const data = await getCostsDashboard(supabase, bounds);

  return <CostsDashboardView data={data} />;
}
