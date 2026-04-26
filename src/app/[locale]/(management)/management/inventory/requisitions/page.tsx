import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequisitionsList } from "@/features/inventory/queries/get-requisitions-list";
import { RequisitionsListView } from "@/features/inventory/components/requisitions-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Requisitions · Inventory",
    description:
      "Material requisition queue — review crew restock requests and create manager-side requisitions.",
  };
}

export default async function ManagementInventoryRequisitionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 ensures inventory_ops:c. Page-level fine-grained
  // check just gates the create CTA — RLS still enforces row-level access.
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canCreate = appMeta.domains?.inventory_ops?.includes("c") ?? false;

  const data = await getRequisitionsList(supabase);

  return <RequisitionsListView data={data} canCreate={canCreate} />;
}
