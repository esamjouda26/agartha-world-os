import type { Metadata } from "next";

import { OrdersListView } from "@/features/maintenance/components/orders-list-view";
import { getOrdersList } from "@/features/maintenance/queries/get-orders-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Work Orders · Maintenance",
    description:
      "Schedule, monitor, and close maintenance work orders. Live RADIUS access state with real-time session updates.",
  };
}

export default async function ManagementMaintenanceOrdersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate-5 already enforced maintenance:c. The fine-grained
  // `c` / `u` checks here only gate UI affordances — RLS still enforces
  // row-level access on every action.
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canCreate = appMeta.domains?.maintenance?.includes("c") ?? false;
  const canMutate = appMeta.domains?.maintenance?.includes("u") ?? false;

  const data = await getOrdersList(supabase);

  return <OrdersListView data={data} canCreate={canCreate} canMutate={canMutate} />;
}
