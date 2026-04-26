import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReconciliationDetail } from "@/features/inventory/queries/get-reconciliation-detail";
import { ReconciliationDetailView } from "@/features/inventory/components/reconciliation-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = Readonly<{
  params: Promise<{ locale: string; id: string }>;
}>;

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Reconciliation · ${id.slice(0, 8)}`,
    description:
      "Stock reconciliation review — compare system vs physical, approve or request recount.",
  };
}

export default async function ManagementInventoryReconciliationDetailPage({
  params,
}: RouteParams) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 ensures inventory_ops:c. Approve + recount actions
  // gate separately on inventory_ops:u (matches RLS UPDATE + RPC).
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canMutate = appMeta.domains?.inventory_ops?.includes("u") ?? false;

  const data = await getReconciliationDetail(supabase, id);
  if (!data) notFound();

  return (
    <ReconciliationDetailView
      data={data}
      canMutate={canMutate}
      locale={locale}
    />
  );
}
