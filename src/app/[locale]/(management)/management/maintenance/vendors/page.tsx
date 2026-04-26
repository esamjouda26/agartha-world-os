import type { Metadata } from "next";

import { VendorsListView } from "@/features/maintenance/components/vendors-list-view";
import { getVendorsList } from "@/features/maintenance/queries/get-vendors-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Vendor Registry · Maintenance",
    description:
      "Manage maintenance vendors authorized to receive RADIUS access during scheduled work orders.",
  };
}

export default async function ManagementMaintenanceVendorsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate-5 already enforced maintenance:c. Fine-grained
  // c/u/d toggles below only gate UI affordances; RLS still enforces
  // row-level mutations.
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canCreate = appMeta.domains?.maintenance?.includes("c") ?? false;
  const canMutate = appMeta.domains?.maintenance?.includes("u") ?? false;
  const canDelete = appMeta.domains?.maintenance?.includes("d") ?? false;

  const data = await getVendorsList(supabase);

  return (
    <VendorsListView
      data={data}
      canCreate={canCreate}
      canMutate={canMutate}
      canDelete={canDelete}
    />
  );
}
