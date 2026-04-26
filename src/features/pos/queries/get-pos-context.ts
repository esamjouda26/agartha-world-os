import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { PosContext, CatalogCategory, CatalogItem, CatalogModifierGroup } from "@/features/pos/types";

/**
 * Auto-detect the caller's POS point via:
 *   staff_records.org_unit_id → org_units → locations.org_unit_id → pos_points.location_id
 *
 * init_schema.sql:1079 — pos_points table
 * init_schema.sql:2154 — display_categories table
 * init_schema.sql:2168 — material_sales_data table
 * init_schema.sql:3049 — pos_modifier_groups table
 * init_schema.sql:3063 — pos_modifier_options table
 * init_schema.sql:3080 — material_modifier_groups table
 *
 * Returns null when:
 *   - Caller has no staff_record
 *   - staff_record's org_unit has no location
 *   - location has no active pos_points
 *
 * Cache model (ADR-0006): React cache() — per-request dedup only. RLS-scoped.
 */
export const getPosContext = cache(
  async (client: SupabaseClient<Database>, userId: string): Promise<PosContext | null> => {
    // Step 1: resolve caller's location via staff_record → org_unit → location
    const { data: profile, error: profileErr } = await client
      .from("profiles")
      .select("staff_record_id")
      .eq("id", userId)
      // .single() — profiles 1:1 with auth.users; absence is a data integrity error
      .single();
    if (profileErr) throw profileErr;
    if (!profile.staff_record_id) return null;

    const { data: staffRecord, error: srErr } = await client
      .from("staff_records")
      .select("org_unit_id")
      .eq("id", profile.staff_record_id)
      .maybeSingle();
    if (srErr) throw srErr;
    if (!staffRecord?.org_unit_id) return null;

    // Step 2: locations.org_unit_id references org_units.id (not the reverse).
    // init_schema.sql:1040 — locations.org_unit_id FK → org_units.id
    const { data: location, error: locErr } = await client
      .from("locations")
      .select("id")
      .eq("org_unit_id", staffRecord.org_unit_id)
      .eq("is_active", true)
      .maybeSingle();
    if (locErr) throw locErr;
    if (!location) return null;

    // Step 3: find active pos_points at this location
    const { data: posPoints, error: ppErr } = await client
      .from("pos_points")
      .select("id, display_name")
      .eq("location_id", location.id)
      .eq("is_active", true)
      .order("display_name");
    if (ppErr) throw ppErr;
    if (!posPoints || posPoints.length === 0) return null;

    // Step 3: load catalog for the first (or only) pos_point.
    // Per spec: "If single POS point → load catalog immediately."
    // Multiple POS points are rare for crew; the page handles the picker case
    // by passing the first detected, but for MVP we always use posPoints[0].
    const firstPoint = posPoints[0];
    if (!firstPoint) return null;
    const posPointId = firstPoint.id;
    const posPointName = firstPoint.display_name;

    // Step 4: load display_categories for this pos_point
    const { data: categories, error: catErr } = await client
      .from("display_categories")
      .select("id, name, sort_order")
      .eq("pos_point_id", posPointId)
      .order("sort_order");
    if (catErr) throw catErr;

    // Step 5: load full catalog (materials + modifier groups + options)
    const { data: salesData, error: sdErr } = await client
      .from("material_sales_data")
      .select(
        "material_id, display_name, selling_price, image_url, allergens, sort_order, display_category_id, materials(id, name)",
      )
      .eq("pos_point_id", posPointId)
      .eq("is_active", true)
      .order("sort_order");
    if (sdErr) throw sdErr;
    if (!salesData || salesData.length === 0) {
      return { posPointId, posPointName, categories: [] };
    }

    // Step 6: load modifier groups linked to the materials in this catalog
    const materialIds = salesData.map((s) => s.material_id);
    const { data: mmGroups, error: mmErr } = await client
      .from("material_modifier_groups")
      .select(
        "material_id, sort_order, pos_modifier_groups(id, display_name, min_selections, max_selections, sort_order, pos_modifier_options(id, name, price_delta, material_id, quantity_delta, sort_order))",
      )
      .in("material_id", materialIds);
    if (mmErr) throw mmErr;

    // Build modifier map keyed by material_id
    const modifierMap = new Map<string, CatalogModifierGroup[]>();
    for (const mm of mmGroups ?? []) {
      const g = mm.pos_modifier_groups as {
        id: string;
        display_name: string;
        min_selections: number | null;
        max_selections: number | null;
        sort_order: number | null;
        pos_modifier_options: Array<{
          id: string;
          name: string;
          price_delta: number;
          material_id: string | null;
          quantity_delta: number;
          sort_order: number | null;
        }>;
      } | null;
      if (!g) continue;
      const group: CatalogModifierGroup = {
        id: g.id,
        displayName: g.display_name,
        minSelections: g.min_selections ?? 0,
        maxSelections: g.max_selections ?? 1,
        sortOrder: g.sort_order ?? 0,
        options: (g.pos_modifier_options ?? [])
          .filter((o) => o)
          .map((o) => ({
            id: o.id,
            name: o.name,
            priceDelta: o.price_delta,
            materialId: o.material_id,
            quantityDelta: o.quantity_delta,
            sortOrder: o.sort_order ?? 0,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      };
      const existing = modifierMap.get(mm.material_id) ?? [];
      existing.push(group);
      modifierMap.set(mm.material_id, existing);
    }

    // Build catalog items
    const categoryMap = new Map<string | null, CatalogItem[]>();
    for (const sd of salesData) {
      const materialRow = sd.materials as { id: string; name: string } | null;
      const item: CatalogItem = {
        materialId: sd.material_id,
        materialName: materialRow?.name ?? sd.material_id,
        displayName: sd.display_name,
        sellingPrice: sd.selling_price,
        imageUrl: sd.image_url,
        allergens: sd.allergens,
        sortOrder: sd.sort_order ?? 0,
        categoryId: sd.display_category_id,
        modifierGroups: (modifierMap.get(sd.material_id) ?? []).sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      };
      const key = sd.display_category_id;
      const existing = categoryMap.get(key) ?? [];
      existing.push(item);
      categoryMap.set(key, existing);
    }

    // Build ordered category list
    const namedCategories: CatalogCategory[] = (categories ?? []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sort_order ?? 0,
      items: (categoryMap.get(cat.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
    }));

    // Uncategorised items (display_category_id IS NULL)
    const uncategorised = categoryMap.get(null) ?? [];
    if (uncategorised.length > 0) {
      namedCategories.push({
        id: null,
        name: "Other",
        sortOrder: 9999,
        items: uncategorised.sort((a, b) => a.sortOrder - b.sortOrder),
      });
    }

    return {
      posPointId,
      posPointName,
      categories: namedCategories.sort((a, b) => a.sortOrder - b.sortOrder),
    };
  },
);
