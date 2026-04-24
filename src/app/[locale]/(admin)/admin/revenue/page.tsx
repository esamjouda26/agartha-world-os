import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getRevenueDashboard,
  resolvePeriodBounds,
} from "@/features/business/queries/get-revenue-dashboard";
import { RevenueDashboardView } from "@/features/business/components/revenue-dashboard-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Revenue & Sales · Admin",
    description:
      "Revenue deep-dive — where money comes from, which products perform, and payment mix.",
  };
}

export default async function AdminRevenuePage({
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
    compare: null,
  });

  const data = await getRevenueDashboard(supabase, bounds);

  return <RevenueDashboardView data={data} />;
}
