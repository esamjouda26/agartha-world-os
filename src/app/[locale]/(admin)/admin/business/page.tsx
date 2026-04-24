import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBusinessDashboard,
  resolvePeriodBounds,
} from "@/features/business/queries/get-business-dashboard";
import { BusinessDashboardView } from "@/features/business/components/business-dashboard-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Executive Dashboard · Admin",
    description: "Cross-domain morning briefing — revenue, operations, guests, and workforce.",
  };
}

export default async function AdminBusinessPage({
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
    from: typeof sp.from === "string" ? sp.from : null,
    to: typeof sp.to === "string" ? sp.to : null,
    compare: typeof sp.compare === "string" ? sp.compare : null,
  });

  const data = await getBusinessDashboard(supabase, bounds);

  return <BusinessDashboardView data={data} />;
}
