import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPurchaseOrdersList } from "@/features/procurement/queries/get-purchase-orders-list";
import { PurchaseOrdersListView } from "@/features/procurement/components/purchase-orders-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Purchase Orders · Procurement",
    description:
      "List and manage all purchase orders — track status, delivery dates, and PO value.",
  };
}

export default async function PurchaseOrdersPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Domain access — procurement
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const procAccess = appMeta.domains?.procurement ?? [];
  const canWrite =
    procAccess.includes("c") || procAccess.includes("u");

  const data = await getPurchaseOrdersList(supabase);

  return (
    <PurchaseOrdersListView
      data={data}
      canWrite={canWrite}
      locale={locale}
    />
  );
}
