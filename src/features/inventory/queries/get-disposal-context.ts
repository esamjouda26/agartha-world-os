import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  DisposalContext,
  LocationOption,
  MaterialOption,
} from "@/features/inventory/types";

/**
 * Loads everything the crew disposal form needs in a single RSC call.
 *
 * Auto-detection logic mirrors `getRestockContext`: resolve caller's
 * staff_record → org_unit_id → first active location in that unit.
 *
 * BOM eligibility: only active, default BOMs are surfaced. The `bom_id`
 * field on write_offs links to bill_of_materials.id — the server-side
 * trigger `trg_write_off_goods_movement` handles exploding the BOM into
 * individual goods movements.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getDisposalContext = cache(
  async (
    client: SupabaseClient<Database>,
    userId: string,
  ): Promise<DisposalContext> => {
    // Resolve auto-location
    const { data: staffRecord } = await client
      .from("staff_records")
      .select("id, org_unit_id")
      .eq("id", userId)
      .maybeSingle();

    let autoLocationId: string | null = null;
    if (staffRecord?.org_unit_id) {
      const { data: locationMatch } = await client
        .from("locations")
        .select("id")
        .eq("org_unit_id", staffRecord.org_unit_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      autoLocationId = locationMatch?.id ?? null;
    }

    // Materials with category consumable flag
    const { data: materialsRaw, error: matError } = await client
      .from("materials")
      .select(
        "id, name, sku, category_id, material_categories!inner(is_consumable)",
      )
      .eq("is_active", true)
      .order("name");
    if (matError) throw matError;

    const materials: ReadonlyArray<MaterialOption> = (materialsRaw ?? []).map(
      (m) => {
        const cat = m.material_categories as { is_consumable: boolean | null };
        return {
          id: m.id,
          name: m.name,
          sku: m.sku,
          categoryId: m.category_id,
          isConsumable: cat?.is_consumable ?? null,
        };
      },
    );

    // Active locations
    const { data: locationsRaw, error: locError } = await client
      .from("locations")
      .select("id, name, org_unit_id")
      .eq("is_active", true)
      .order("name");
    if (locError) throw locError;

    const locations: ReadonlyArray<LocationOption> = (locationsRaw ?? []).map(
      (l) => ({
        id: l.id,
        name: l.name,
        orgUnitId: l.org_unit_id,
      }),
    );

    // Allowed categories for the auto-detected location (for UI filtering)
    let allowedCategoryIds: ReadonlyArray<string> = [];
    if (autoLocationId) {
      const { data: allowedRaw, error: allowedError } = await client
        .from("location_allowed_categories")
        .select("category_id")
        .eq("location_id", autoLocationId);
      if (allowedError) throw allowedError;
      allowedCategoryIds = (allowedRaw ?? []).map((r) => r.category_id);
    }

    // Active default BOMs for BOM explosion UI
    const { data: bomsRaw, error: bomError } = await client
      .from("bill_of_materials")
      .select("id, parent_material_id")
      .eq("status", "active")
      .eq("is_default", true);
    if (bomError) throw bomError;

    const activeBoms = (bomsRaw ?? []).map((b) => ({
      id: b.id,
      parentMaterialId: b.parent_material_id,
    }));

    // Material valuations (moving_avg_cost preferred, fallback standard_cost)
    const { data: valuationsRaw, error: valError } = await client
      .from("material_valuation")
      .select("material_id, location_id, moving_avg_cost, standard_cost");
    if (valError) throw valError;

    const valuations = (valuationsRaw ?? []).map((v) => ({
      materialId: v.material_id,
      locationId: v.location_id,
      movingAvgCost: v.moving_avg_cost,
      standardCost: v.standard_cost,
    }));

    return {
      materials,
      locations,
      autoLocationId,
      allowedCategoryIds,
      activeBoms,
      valuations,
    };
  },
);
