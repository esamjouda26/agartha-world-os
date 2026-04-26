import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMaterialsStockList } from "@/features/inventory/queries/get-materials-stock-list";
import { MaterialsStockView } from "@/features/inventory/components/materials-stock-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Materials & Stock · Inventory",
    description:
      "Master material registry with on-hand stock balance and inventory value per location.",
  };
}

export default async function ManagementInventoryPage() {
  const supabase = await createSupabaseServerClient();
  const data = await getMaterialsStockList(supabase);
  return <MaterialsStockView data={data} />;
}
