import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getGuestsDashboard,
  resolvePeriodBounds,
} from "@/features/guests/queries/get-guests-dashboard";
import { GuestsDashboardView } from "@/features/guests/components/guests-dashboard-view";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Guest Satisfaction · Admin",
    description: "NPS, rating distributions, complaint themes, and response rate.",
  };
}
export default async function AdminGuestsPage({
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
  const data = await getGuestsDashboard(supabase, bounds);
  return <GuestsDashboardView data={data} />;
}
