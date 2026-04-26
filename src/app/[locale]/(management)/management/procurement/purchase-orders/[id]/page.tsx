import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPurchaseOrderDetail } from "@/features/procurement/queries/get-purchase-order-detail";
import { PODetailView } from "@/features/procurement/components/po-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("suppliers ( name )")
    .eq("id", id)
    .maybeSingle();

  const supplierName = (data?.suppliers as { name: string } | null)?.name;

  return {
    title: supplierName
      ? `PO — ${supplierName} · Purchase Orders · Procurement`
      : "PO Detail · Procurement",
    description:
      "Purchase order detail with line items, status management, and receiving history.",
  };
}

export default async function PurchaseOrderDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params;
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
  const canWrite = procAccess.includes("u") || procAccess.includes("c");

  const detailData = await getPurchaseOrderDetail(supabase, id);
  if (!detailData) notFound();

  return <PODetailView data={detailData} canWrite={canWrite} />;
}
