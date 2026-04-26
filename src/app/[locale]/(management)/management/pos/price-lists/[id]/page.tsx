import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPriceListDetail } from "@/features/pos/queries/get-price-list-detail";
import { PriceListDetailView } from "@/features/pos/components/price-list-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("price_lists")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  return {
    title: data?.name ? `${data.name} · Price List` : "Price List Detail",
    description: "Manage line items within this price list.",
  };
}

export default async function PriceListDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const posAccess = appMeta.domains?.pos ?? [];
  if (!posAccess.includes("c") && !posAccess.includes("r")) {
    redirect(`/${locale}/management`);
  }

  const canWrite = posAccess.includes("c") || posAccess.includes("u");

  const data = await getPriceListDetail(supabase, id);
  if (!data) notFound();

  return <PriceListDetailView data={data} canWrite={canWrite} />;
}
