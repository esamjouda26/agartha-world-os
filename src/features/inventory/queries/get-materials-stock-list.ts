import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  MaterialStockKpis,
  MaterialStockListData,
  MaterialStockRow,
  StockByLocationRow,
  MaterialType,
} from "@/features/inventory/types";

/**
 * RSC query — payload for `/management/inventory` (Materials & Stock).
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only. RLS
 * scopes every read; `unstable_cache` would force a service-role client and
 * bypass RLS.
 *
 * Joins materials → categories → units, then aggregates `stock_balance_cache`
 * across every location per material in JS to build the per-row drill-down
 * grid. `stock_balance_cache` is the operational denormalization
 * (init_schema.sql:2577-2586) — never use `v_stock_on_hand` here, that view
 * scans goods_movement_items and is documented as nightly-drift-only
 * (init_schema.sql:2600-2602).
 */
export const getMaterialsStockList = cache(
  async (client: SupabaseClient<Database>): Promise<MaterialStockListData> => {
    // ── 1. Materials + category name + unit abbreviation ───────────────
    const { data: rawMaterials, error: matErr } = await client
      .from("materials")
      .select(
        `
        id,
        name,
        sku,
        material_type,
        category_id,
        base_unit_id,
        reorder_point,
        valuation_method,
        is_active,
        material_categories!materials_category_id_fkey ( name ),
        units!materials_base_unit_id_fkey ( abbreviation )
        `,
      )
      .order("name", { ascending: true });
    if (matErr) throw matErr;

    // ── 2. Stock balances (current_qty + stock_value per location) ─────
    const { data: rawStock, error: stockErr } = await client
      .from("stock_balance_cache")
      .select("material_id, location_id, current_qty, stock_value");
    if (stockErr) throw stockErr;

    // ── 3. Locations directory (for the drill-down grid + filter) ──────
    const { data: rawLocations, error: locErr } = await client
      .from("locations")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (locErr) throw locErr;

    // ── 4. Active categories for the filter dropdown ───────────────────
    const { data: rawCats, error: catErr } = await client
      .from("material_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (catErr) throw catErr;

    // ── 5. Index stock balances by material_id ─────────────────────────
    const locationNameById = new Map<string, string>();
    for (const loc of rawLocations ?? []) {
      locationNameById.set(loc.id, loc.name);
    }

    const stockByMaterial = new Map<string, StockByLocationRow[]>();
    for (const sb of rawStock ?? []) {
      const list = stockByMaterial.get(sb.material_id) ?? [];
      list.push({
        locationId: sb.location_id,
        locationName: locationNameById.get(sb.location_id) ?? "Unknown location",
        currentQty: Number(sb.current_qty ?? 0),
        stockValue: Number(sb.stock_value ?? 0),
      });
      stockByMaterial.set(sb.material_id, list);
    }

    // ── 6. Project rows + accumulate KPIs ──────────────────────────────
    let activeSkusCount = 0;
    let zeroStockCount = 0;
    let belowReorderCount = 0;
    let totalInventoryValue = 0;

    const rows: MaterialStockRow[] = (rawMaterials ?? []).map((m) => {
      const cat = m.material_categories as { name: string } | null;
      const unit = m.units as { abbreviation: string } | null;
      const byLocation = (stockByMaterial.get(m.id) ?? []).sort((a, b) =>
        a.locationName.localeCompare(b.locationName),
      );
      const onHand = byLocation.reduce((s, b) => s + b.currentQty, 0);
      const totalStockValue = byLocation.reduce((s, b) => s + b.stockValue, 0);
      const reorderPoint = Number(m.reorder_point ?? 0);
      const isActive = m.is_active ?? true;

      if (isActive) activeSkusCount += 1;
      if (onHand === 0) zeroStockCount += 1;
      if (reorderPoint > 0 && onHand <= reorderPoint) belowReorderCount += 1;
      totalInventoryValue += totalStockValue;

      return {
        id: m.id,
        name: m.name,
        sku: m.sku,
        materialType: m.material_type as MaterialType,
        categoryId: m.category_id,
        categoryName: cat?.name ?? null,
        baseUnitId: m.base_unit_id,
        baseUnitAbbreviation: unit?.abbreviation ?? null,
        valuationMethod: m.valuation_method ?? "moving_avg",
        reorderPoint,
        isActive,
        onHand,
        totalStockValue,
        byLocation,
      };
    });

    const kpis: MaterialStockKpis = {
      activeSkusCount,
      zeroStockCount,
      belowReorderCount,
      totalInventoryValue,
    };

    return {
      rows,
      kpis,
      categories: (rawCats ?? []).map((c) => ({ id: c.id, name: c.name })),
      locations: (rawLocations ?? []).map((l) => ({ id: l.id, name: l.name })),
    };
  },
);
