import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  MaterialCategoriesPageData,
  MaterialCategoryRow,
  LocationAllowedCategoryRow,
  LocationOptionRow,
} from "@/features/procurement/types";

/**
 * RSC query — payload for the cross-domain `/management/categories` page.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup. RLS on
 * `material_categories` allows SELECT for any authenticated user
 * (init_schema.sql:1253-1254); same for `location_allowed_categories`
 * (1272-1273) and `locations`. Writes are gated separately by Server
 * Actions (procurement OR pos for categories; system for the junction).
 */
export const getMaterialCategoriesPage = cache(
  async (
    client: SupabaseClient<Database>,
  ): Promise<MaterialCategoriesPageData> => {
    // ── 1. Categories ordered by ltree path ──────────────────────────
    const { data: rawCats, error: catErr } = await client
      .from("material_categories")
      .select(
        `
        id,
        parent_id,
        code,
        name,
        depth,
        path,
        is_bom_eligible,
        is_consumable,
        default_valuation,
        accounting_category,
        sort_order,
        is_active
        `,
      )
      .order("path", { ascending: true });
    if (catErr) throw catErr;

    // ── 2. Active locations ──────────────────────────────────────────
    const { data: rawLocations, error: locErr } = await client
      .from("locations")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (locErr) throw locErr;

    // ── 3. Junction rows joined with location name ───────────────────
    const { data: rawJunction, error: junctionErr } = await client
      .from("location_allowed_categories")
      .select(
        `
        location_id,
        category_id,
        locations!location_allowed_categories_location_id_fkey ( name )
        `,
      );
    if (junctionErr) throw junctionErr;

    const categories: MaterialCategoryRow[] = (rawCats ?? []).map((c) => ({
      id: c.id,
      parentId: c.parent_id,
      code: c.code ?? "",
      name: c.name,
      depth: c.depth,
      path: String(c.path),
      isBomEligible: c.is_bom_eligible ?? false,
      isConsumable: c.is_consumable ?? false,
      defaultValuation: c.default_valuation,
      accountingCategory: c.accounting_category,
      sortOrder: c.sort_order ?? 0,
      isActive: c.is_active ?? true,
    }));

    const locations: LocationOptionRow[] = (rawLocations ?? []).map((l) => ({
      id: l.id,
      name: l.name,
    }));

    const locationCategories: LocationAllowedCategoryRow[] = (
      rawJunction ?? []
    ).map((j) => {
      const loc = j.locations as { name: string } | null;
      return {
        locationId: j.location_id,
        locationName: loc?.name ?? "Unknown location",
        categoryId: j.category_id,
      };
    });

    return { categories, locations, locationCategories };
  },
);
