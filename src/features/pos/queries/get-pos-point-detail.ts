import "server-only";

import { cache } from "react";
import { subDays } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  PosPointDetailData,
  CatalogRow,
  DisplayCategoryRow,
  BomPreviewRow,
} from "@/features/pos/types/management";

/**
 * RSC query — all data for /management/pos/[id] (POS point detail).
 *
 * Phase 1 (parallel): pos_point + catalog items + 7-day order stats
 *   + available materials + display categories for this point.
 * Phase 2 (after catalog): active default BOMs for the catalog material IDs.
 *
 * Schema refs:
 *   init_schema.sql:1079  — pos_points
 *   init_schema.sql:2154  — display_categories
 *   init_schema.sql:2168  — material_sales_data (composite PK: material_id, pos_point_id)
 *   init_schema.sql:2225  — bill_of_materials
 *   init_schema.sql:2248  — bom_components
 *   init_schema.sql:3022  — orders
 *   init_schema.sql:3038  — order_items
 *
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getPosPointDetail = cache(
  async (
    client: SupabaseClient<Database>,
    posPointId: string,
  ): Promise<PosPointDetailData | null> => {
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();

    // ── Phase 1: parallel queries ────────────────────────────────────
    const [posPointResult, catalogResult, ordersResult, materialsResult, categoriesResult] =
      await Promise.all([
        client
          .from("pos_points")
          .select("id, name, display_name, is_active, locations!pos_points_location_id_fkey(name)")
          .eq("id", posPointId)
          .maybeSingle(),

        // Composite FK (display_category_id, pos_point_id) → display_categories
        // can't be auto-joined by PostgREST; we resolve category names from
        // the separate categoriesResult query below.
        client
          .from("material_sales_data")
          .select(
            "material_id, display_name, selling_price, display_category_id, image_url, allergens, sort_order, is_active, materials!material_sales_data_material_id_fkey(name, material_type)",
          )
          .eq("pos_point_id", posPointId)
          .order("sort_order", { ascending: true }),

        // completed orders for this point in the last 7 days (for stats)
        client
          .from("orders")
          .select("id")
          .eq("pos_point_id", posPointId)
          .eq("status", "completed")
          .gte("created_at", sevenDaysAgo),

        client
          .from("materials")
          .select("id, name, material_type")
          .eq("is_active", true)
          .order("name", { ascending: true }),

        client
          .from("display_categories")
          .select("id, name, sort_order")
          .eq("pos_point_id", posPointId)
          .order("sort_order", { ascending: true }),
      ]);

    if (posPointResult.error) throw posPointResult.error;
    if (!posPointResult.data) return null;
    if (catalogResult.error) throw catalogResult.error;
    if (materialsResult.error) throw materialsResult.error;
    if (categoriesResult.error) throw categoriesResult.error;

    // ── 7-day stats: query order_items for the matched orders ────────
    const orderIds = (ordersResult.data ?? []).map((o) => o.id);
    const statsMap = new Map<string, { sold: number; revenue: number }>();

    if (orderIds.length > 0) {
      const { data: items, error: itemsErr } = await client
        .from("order_items")
        .select("material_id, quantity, unit_price")
        .in("order_id", orderIds);
      if (itemsErr) throw itemsErr;

      for (const item of items ?? []) {
        const existing = statsMap.get(item.material_id) ?? { sold: 0, revenue: 0 };
        statsMap.set(item.material_id, {
          sold: existing.sold + Number(item.quantity),
          revenue: existing.revenue + Number(item.quantity) * Number(item.unit_price),
        });
      }
    }

    // ── Phase 2: BOMs for catalog material IDs ────────────────────────
    const catalogData = catalogResult.data ?? [];
    const materialIds = catalogData.map((r) => r.material_id);
    const bomMap = new Map<string, BomPreviewRow[]>();

    if (materialIds.length > 0) {
      const { data: boms, error: bomsErr } = await client
        .from("bill_of_materials")
        .select(
          "id, parent_material_id, bom_components(id, component_material_id, quantity, scrap_pct, is_phantom, sort_order, materials!bom_components_component_material_id_fkey(name))",
        )
        .in("parent_material_id", materialIds)
        .eq("status", "active")
        .eq("is_default", true);
      if (bomsErr) throw bomsErr;

      for (const bom of boms ?? []) {
        const rows: BomPreviewRow[] = (bom.bom_components ?? []).map((c) => {
          const mat = c.materials as { name: string } | null;
          return {
            bomId: bom.id,
            parentMaterialId: bom.parent_material_id,
            componentMaterialId: c.component_material_id,
            componentMaterialName: mat?.name ?? "Unknown",
            quantity: Number(c.quantity),
            scrapPct: Number(c.scrap_pct ?? 0),
            isPhantom: c.is_phantom ?? false,
            sortOrder: c.sort_order ?? 0,
          };
        });
        bomMap.set(bom.parent_material_id, rows);
      }
    }

    // ── Assemble catalog rows ────────────────────────────────────────
    const pp = posPointResult.data;
    const loc = pp.locations as { name: string } | null;

    // Build a category name map from the separate categories result
    const categoryNameMap = new Map(
      (categoriesResult.data ?? []).map((c) => [c.id, c.name]),
    );

    const catalog: CatalogRow[] = catalogData.map((r) => {
      const mat = r.materials as { name: string; material_type: string } | null;
      const stats = statsMap.get(r.material_id) ?? { sold: 0, revenue: 0 };
      return {
        materialId: r.material_id,
        materialName: mat?.name ?? "Unknown",
        displayName: r.display_name ?? null,
        // DB NUMERIC → integer cents (×100)
        sellingPrice: Math.round(Number(r.selling_price) * 100),
        displayCategoryId: r.display_category_id ?? null,
        displayCategoryName: r.display_category_id ? (categoryNameMap.get(r.display_category_id) ?? null) : null,
        imageUrl: r.image_url ?? null,
        allergens: r.allergens ?? null,
        sortOrder: r.sort_order ?? 0,
        isActive: r.is_active ?? true,
        soldLast7d: stats.sold,
        revenueLast7d: Math.round(stats.revenue * 100),
      };
    });

    const displayCategories: DisplayCategoryRow[] = (categoriesResult.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sort_order ?? 0,
    }));

    return {
      posPoint: {
        id: pp.id,
        name: pp.name,
        displayName: pp.display_name,
        locationName: loc?.name ?? null,
        isActive: pp.is_active ?? true,
      },
      catalog,
      displayCategories,
      bomPreviews: Array.from(bomMap.values()).flat(),
      materials: (materialsResult.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        materialType: m.material_type,
      })),
    };
  },
);
