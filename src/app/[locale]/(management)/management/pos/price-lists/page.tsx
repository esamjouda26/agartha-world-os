import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPriceLists } from "@/features/pos/queries/get-price-lists";
import { PriceListsView } from "@/features/pos/components/price-lists-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Price Lists · POS",
    description: "Manage selling price lists with effectivity dates.",
  };
}

export default async function PriceListsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
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

  const data = await getPriceLists(supabase);

  return <PriceListsView data={data} canWrite={canWrite} />;
}
