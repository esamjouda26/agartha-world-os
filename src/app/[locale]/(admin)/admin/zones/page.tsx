import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getZonesPage } from "@/features/zones/queries/get-zones-page";
import { ZonesPageView } from "@/features/zones/components/zones-page-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Zones & Locations · Admin",
    description: "Manage physical locations, floor zones, and category permissions.",
  };
}

export default async function AdminZonesPage({
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

  const data = await getZonesPage(supabase);

  return <ZonesPageView data={data} canWrite={canWrite} />;
}
