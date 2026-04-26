import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEquipmentList } from "@/features/inventory/queries/get-equipment-list";
import { EquipmentCustodyView } from "@/features/inventory/components/equipment-custody-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Equipment Custody · Inventory",
    description:
      "Returnable assets ledger — issue equipment to staff and record returns.",
  };
}

export default async function ManagementInventoryEquipmentPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware Gate 5 enforces inventory_ops:c. Issue requires :c,
  // return requires :u — both gated separately at the action layer
  // and reflected in the page-level CTA visibility.
  const appMeta = (user?.app_metadata ?? {}) as {
    domains?: Record<string, readonly string[]>;
  };
  const canIssue = appMeta.domains?.inventory_ops?.includes("c") ?? false;
  const canReturn = appMeta.domains?.inventory_ops?.includes("u") ?? false;

  const data = await getEquipmentList(supabase);
  return (
    <EquipmentCustodyView
      data={data}
      canIssue={canIssue}
      canReturn={canReturn}
    />
  );
}
