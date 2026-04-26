import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequisitionDetail } from "@/features/inventory/queries/get-requisition-detail";
import { RequisitionDetailView } from "@/features/inventory/components/requisition-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = Readonly<{ params: Promise<{ locale: string; id: string }> }>;

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Requisition · ${id.slice(0, 8)}`,
    description:
      "Material requisition detail — review line items, reassign or cancel.",
  };
}

export default async function ManagementInventoryRequisitionDetailPage({
  params,
}: RouteParams) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 ensures inventory_ops:c. Mutation buttons gate
  // separately on inventory_ops:u (matches RLS UPDATE policy).
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canMutate = appMeta.domains?.inventory_ops?.includes("u") ?? false;

  const data = await getRequisitionDetail(supabase, id);
  if (!data) notFound();

  return (
    <RequisitionDetailView data={data} canMutate={canMutate} locale={locale} />
  );
}
