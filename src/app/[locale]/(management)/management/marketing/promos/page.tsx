import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPromosList } from "@/features/marketing/queries/get-promos-list";
import { PromosListView } from "@/features/marketing/components/promos-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Promo Codes · Marketing",
    description: "Discount codes with tier and temporal validity for the booking flow.",
  };
}

export default async function ManagementMarketingPromosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate already enforces `marketing:c`. Page-level capability
  // checks just gate the corresponding CTAs — RLS still enforces row-level.
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canCreate = appMeta.domains?.marketing?.includes("c") ?? false;
  const canUpdate = appMeta.domains?.marketing?.includes("u") ?? false;
  const canDelete = appMeta.domains?.marketing?.includes("d") ?? false;

  const data = await getPromosList(supabase);

  return (
    <PromosListView data={data} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
  );
}
