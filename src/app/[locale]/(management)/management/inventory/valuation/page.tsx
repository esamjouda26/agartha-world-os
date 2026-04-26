import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getValuationList } from "@/features/inventory/queries/get-valuation-list";
import { ValuationView } from "@/features/inventory/components/valuation-view";
import { MATERIAL_TYPES } from "@/features/inventory/constants";
import type { MaterialType } from "@/features/inventory/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Material Valuation · Inventory",
    description:
      "Cost analysis per material per location — standard, moving-average, and last-purchase cost basis.",
  };
}

type SearchParams = Readonly<{
  location?: string;
  material_type?: string;
}>;

function parseMaterialTypes(
  input: string | undefined,
): ReadonlyArray<MaterialType> | null {
  if (!input) return null;
  const allowed = new Set<string>(MATERIAL_TYPES);
  const parsed = input
    .split(",")
    .filter((t) => allowed.has(t)) as MaterialType[];
  return parsed.length > 0 ? parsed : null;
}

export default async function ManagementInventoryValuationPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  // Middleware Gate 5 enforces inventory:r — page is read-only, no
  // mutations, no per-CTA fine-grained gating needed.
  const data = await getValuationList(supabase, {
    locationId: sp.location ?? null,
    materialTypes: parseMaterialTypes(sp.material_type),
  });
  return <ValuationView data={data} />;
}
