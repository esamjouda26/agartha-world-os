import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getWorkforceDashboard,
  resolvePeriodBounds,
} from "@/features/workforce/queries/get-workforce-dashboard";
import { WorkforceDashboardView } from "@/features/workforce/components/workforce-dashboard-view";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Workforce · Admin",
    description:
      "Headcount, attendance compliance, leave utilisation, and department distribution.",
  };
}
export default async function AdminWorkforcePage({
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
  const bounds = resolvePeriodBounds({ range: typeof sp.range === "string" ? sp.range : null });
  const data = await getWorkforceDashboard(supabase, bounds);
  return <WorkforceDashboardView data={data} />;
}
