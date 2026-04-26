import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  MaterialType,
  ValuationListData,
  ValuationListKpis,
  ValuationListRow,
} from "@/features/inventory/types";

export type GetValuationListInput = Readonly<{
  locationId: string | null;
  /** Subset of material_type enum values; null = no filter. */
  materialTypes: ReadonlyArray<MaterialType> | null;
}>;

/**
 * RSC query — payload for `/management/inventory/valuation`.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup. RLS
 * `inventory:r` gates SELECT on `material_valuation` and `stock_balance_cache`.
 *
 * Composite-PK join: `material_valuation` and `stock_balance_cache`
 * share `(material_id, location_id)` as PK but PostgREST cannot
 * auto-resolve composite-FK joins (POS postmortem). We fetch each
 * table separately and merge on the tuple key in JS.
 *
 * KPIs (total inventory value, highest-value location/SKU) are
 * computed over the active filter set so they always reflect what
 * the user is viewing.
 */
export const getValuationList = cache(
  async (
    client: SupabaseClient<Database>,
    input: GetValuationListInput,
  ): Promise<ValuationListData> => {
    // ── 1. Materials (joined with material name + type + unit) ────────
    let materialsQuery = client
      .from("materials")
      .select(
        `
        id,
        name,
        material_type,
        is_active,
        units!materials_base_unit_id_fkey ( abbreviation )
        `,
      )
      .eq("is_active", true);
    if (input.materialTypes && input.materialTypes.length > 0) {
      materialsQuery = materialsQuery.in("material_type", input.materialTypes);
    }
    const { data: rawMaterials, error: matErr } = await materialsQuery.order(
      "name",
      { ascending: true },
    );
    if (matErr) throw matErr;
    const materialIds = (rawMaterials ?? []).map((m) => m.id);
    const materialMap = new Map<
      string,
      {
        name: string;
        materialType: MaterialType;
        unitAbbreviation: string | null;
      }
    >();
    for (const m of rawMaterials ?? []) {
      const unit = m.units as { abbreviation: string } | null;
      materialMap.set(m.id, {
        name: m.name,
        materialType: m.material_type as MaterialType,
        unitAbbreviation: unit?.abbreviation ?? null,
      });
    }

    // ── 2. Active locations (filter picker + name resolution) ─────────
    const { data: rawLocations, error: locErr } = await client
      .from("locations")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (locErr) throw locErr;
    const locationMap = new Map<string, { name: string }>();
    for (const l of rawLocations ?? []) {
      locationMap.set(l.id, { name: l.name });
    }

    // ── 3. Valuation rows for the filtered material set ───────────────
    let valQuery = client
      .from("material_valuation")
      .select(
        "material_id, location_id, standard_cost, moving_avg_cost, last_purchase_cost",
      );
    if (materialIds.length > 0) {
      valQuery = valQuery.in("material_id", materialIds);
    }
    if (input.locationId) {
      valQuery = valQuery.eq("location_id", input.locationId);
    }
    const { data: rawValuation, error: valErr } = await valQuery;
    if (valErr) throw valErr;

    // ── 4. Stock balance cache rows for the same set ──────────────────
    let stockQuery = client
      .from("stock_balance_cache")
      .select("material_id, location_id, current_qty, stock_value");
    if (materialIds.length > 0) {
      stockQuery = stockQuery.in("material_id", materialIds);
    }
    if (input.locationId) {
      stockQuery = stockQuery.eq("location_id", input.locationId);
    }
    const { data: rawStock, error: stockErr } = await stockQuery;
    if (stockErr) throw stockErr;

    const stockKey = (materialId: string, locationId: string): string =>
      `${materialId}:${locationId}`;
    const stockMap = new Map<
      string,
      { currentQty: number; stockValue: number }
    >();
    for (const s of rawStock ?? []) {
      stockMap.set(stockKey(s.material_id, s.location_id), {
        currentQty: Number(s.current_qty ?? 0),
        stockValue: Number(s.stock_value ?? 0),
      });
    }

    // ── 5. Project rows — material_valuation drives the row set; we
    //       enrich with name/type/unit/location/stock. Materials
    //       without a valuation row at the location are skipped (the
    //       page is an "actual valuation" report, not an inventory
    //       audit).
    const rows: ValuationListRow[] = [];
    for (const v of rawValuation ?? []) {
      const mat = materialMap.get(v.material_id);
      if (!mat) continue; // material filtered out by material_type
      const loc = locationMap.get(v.location_id);
      if (!loc) continue; // inactive location — drop
      const stock = stockMap.get(stockKey(v.material_id, v.location_id));
      const stockValue = stock?.stockValue ?? 0;
      rows.push({
        rowId: stockKey(v.material_id, v.location_id),
        materialId: v.material_id,
        materialName: mat.name,
        materialType: mat.materialType,
        baseUnitAbbreviation: mat.unitAbbreviation,
        locationId: v.location_id,
        locationName: loc.name,
        standardCost:
          v.standard_cost === null ? null : Number(v.standard_cost),
        movingAvgCost:
          v.moving_avg_cost === null ? null : Number(v.moving_avg_cost),
        lastPurchaseCost:
          v.last_purchase_cost === null ? null : Number(v.last_purchase_cost),
        currentQty: stock?.currentQty ?? 0,
        stockValue,
      });
    }

    // Default sort — highest stock value first (most material to the eye).
    rows.sort((a, b) => b.stockValue - a.stockValue);

    // ── 6. KPI aggregates over the filtered row set ───────────────────
    let totalInventoryValue = 0;
    const valueByLocation = new Map<string, number>();
    const valueBySku = new Map<string, number>();
    const skuName = new Map<string, string>();
    for (const r of rows) {
      totalInventoryValue += r.stockValue;
      valueByLocation.set(
        r.locationId,
        (valueByLocation.get(r.locationId) ?? 0) + r.stockValue,
      );
      valueBySku.set(
        r.materialId,
        (valueBySku.get(r.materialId) ?? 0) + r.stockValue,
      );
      skuName.set(r.materialId, r.materialName);
    }
    let highestLocId: string | null = null;
    let highestLocVal = 0;
    for (const [id, value] of valueByLocation.entries()) {
      if (value > highestLocVal) {
        highestLocId = id;
        highestLocVal = value;
      }
    }
    let highestSkuId: string | null = null;
    let highestSkuVal = 0;
    for (const [id, value] of valueBySku.entries()) {
      if (value > highestSkuVal) {
        highestSkuId = id;
        highestSkuVal = value;
      }
    }
    const highestLocName =
      highestLocId !== null
        ? (locationMap.get(highestLocId)?.name ?? "Unknown location")
        : null;
    const highestSkuName =
      highestSkuId !== null ? (skuName.get(highestSkuId) ?? null) : null;

    const kpis: ValuationListKpis = {
      totalInventoryValue,
      highestValueLocation:
        highestLocName !== null
          ? { name: highestLocName, value: highestLocVal }
          : null,
      highestValueSku:
        highestSkuName !== null
          ? { name: highestSkuName, value: highestSkuVal }
          : null,
    };

    return {
      rows,
      kpis,
      locations: (rawLocations ?? []).map((l) => ({
        id: l.id,
        name: l.name,
      })),
    };
  },
);
