import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReconciliationsList } from "@/features/inventory/queries/get-reconciliations-list";
import { ReconciliationsListView } from "@/features/inventory/components/reconciliations-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Stock Reconciliation · Inventory",
    description:
      "Schedule blind stock counts, review counts, and approve adjustments.",
  };
}

export default async function ManagementInventoryReconciliationPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 ensures inventory_ops:c. Page-level fine-grained
  // check just gates the schedule CTA.
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canCreate = appMeta.domains?.inventory_ops?.includes("c") ?? false;

  const data = await getReconciliationsList(supabase);
  return <ReconciliationsListView data={data} canCreate={canCreate} />;
}
