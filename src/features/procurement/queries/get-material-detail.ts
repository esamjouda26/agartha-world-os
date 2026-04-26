import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  MaterialDetailData,
  MaterialProfile,
  MaterialSupplierRow,
  MaterialStockInfo,
  UomConversionRow,
} from "@/features/procurement/types";

/**
 * RSC query — all data for /management/procurement/[id] (material detail).
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * Parallel fetches for: material record, supplier links, stock cache,
 * UOM conversions (material-specific + global), and open PO count.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/[id]`
 *   Tabs: info | suppliers | uom
 *   RSC fetches: materials WHERE id, material_procurement_data JOIN suppliers/units,
 *                uom_conversions WHERE material_id = param OR material_id IS NULL
 */
export const getMaterialDetail = cache(
  async (
    client: SupabaseClient<Database>,
    materialId: string,
  ): Promise<MaterialDetailData | null> => {
    // ── 1. Core material record + category + base unit ────────────
    const { data: mat, error: matErr } = await client
      .from("materials")
      .select(
        `
        id,
        name,
        sku,
        barcode,
        material_type,
        category_id,
        base_unit_id,
        reorder_point,
        safety_stock,
        standard_cost,
        valuation_method,
        shelf_life_days,
        storage_conditions,
        weight_kg,
        is_returnable,
        is_active,
        created_at,
        updated_at,
        material_categories ( name ),
        units!materials_base_unit_id_fkey ( name, abbreviation )
        `,
      )
      .eq("id", materialId)
      .maybeSingle();

    if (matErr) throw matErr;
    if (!mat) return null;

    // ── 2. Parallel enrichment fetches ────────────────────────────
    const [
      suppliersRes,
      stockRes,
      uomRes,
      openPoRes,
      unitsRes,
      allSuppliersRes,
      categoriesRes,
    ] = await Promise.all([
      // Supplier links
      client
        .from("material_procurement_data")
        .select(
          `
          supplier_id,
          supplier_sku,
          cost_price,
          lead_time_days,
          min_order_qty,
          is_default,
          suppliers ( name ),
          units!material_procurement_data_purchase_unit_id_fkey ( name )
          `,
        )
        .eq("material_id", materialId)
        .order("is_default", { ascending: false }),

      // Stock from cache — aggregate across all locations
      client
        .from("stock_balance_cache")
        .select("current_qty, last_synced_at")
        .eq("material_id", materialId),

      // UOM conversions — material-specific + global (material_id IS NULL)
      client
        .from("uom_conversions")
        .select(
          `
          id,
          material_id,
          factor,
          from_unit:units!uom_conversions_from_unit_id_fkey ( name, abbreviation ),
          to_unit:units!uom_conversions_to_unit_id_fkey ( name, abbreviation )
          `,
        )
        .or(`material_id.eq.${materialId},material_id.is.null`),

      // Open PO lines
      client
        .from("purchase_order_items")
        .select("id, purchase_orders!inner ( status )", { count: "exact", head: true })
        .eq("material_id", materialId)
        .in("purchase_orders.status", ["draft", "sent", "partially_received"]),

      // Reference data: units for form dropdowns
      client
        .from("units")
        .select("id, name, abbreviation")
        .order("name", { ascending: true }),

      // Reference data: all suppliers for form dropdowns
      client
        .from("suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),

      // Reference data: categories for form dropdowns
      client
        .from("material_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    // ── 3. Map profile ───────────────────────────────────────────
    const category = mat.material_categories as { name: string } | null;
    const unit = mat.units as { name: string; abbreviation: string } | null;

    const profile: MaterialProfile = {
      id: mat.id,
      name: mat.name,
      sku: mat.sku ?? null,
      barcode: mat.barcode ?? null,
      materialType: mat.material_type,
      categoryName: category?.name ?? null,
      categoryId: mat.category_id,
      baseUnitName: unit?.name ?? null,
      baseUnitAbbreviation: unit?.abbreviation ?? null,
      baseUnitId: mat.base_unit_id,
      reorderPoint: Number(mat.reorder_point ?? 0),
      safetyStock: Number(mat.safety_stock ?? 0),
      standardCost: mat.standard_cost != null ? Number(mat.standard_cost) : null,
      valuationMethod: mat.valuation_method ?? "moving_avg",
      shelfLifeDays: mat.shelf_life_days ?? null,
      storageConditions: mat.storage_conditions ?? null,
      weightKg: mat.weight_kg != null ? Number(mat.weight_kg) : null,
      isReturnable: mat.is_returnable ?? false,
      isActive: mat.is_active ?? true,
      createdAt: mat.created_at,
      updatedAt: mat.updated_at ?? null,
    };

    // ── 4. Map suppliers ─────────────────────────────────────────
    const suppliers: MaterialSupplierRow[] = (suppliersRes.data ?? []).map(
      (s) => {
        const supplier = s.suppliers as { name: string } | null;
        const purchaseUnit = s.units as { name: string } | null;
        return {
          supplierId: s.supplier_id,
          supplierName: supplier?.name ?? "Unknown",
          supplierSku: s.supplier_sku ?? null,
          costPrice: Number(s.cost_price),
          purchaseUnitName: purchaseUnit?.name ?? null,
          leadTimeDays: s.lead_time_days ?? 0,
          minOrderQty: Number(s.min_order_qty ?? 1),
          isDefault: s.is_default ?? false,
        };
      },
    );

    // ── 5. Map stock (aggregate across locations) ─────────────────
    const stockRows = stockRes.data ?? [];
    const totalOnHand = stockRows.reduce(
      (sum, row) => sum + Number(row.current_qty ?? 0),
      0,
    );
    const lastSynced = stockRows.length > 0
      ? stockRows
          .map((r) => r.last_synced_at)
          .sort()
          .pop() ?? null
      : null;
    const stock: MaterialStockInfo = {
      onHand: totalOnHand,
      allocated: 0,
      available: totalOnHand,
      lastCountedAt: lastSynced,
    };

    // ── 6. Map UOM conversions ───────────────────────────────────
    const uomConversions: UomConversionRow[] = (uomRes.data ?? []).map((c) => {
      const fromUnit = c.from_unit as { name: string; abbreviation: string } | null;
      const toUnit = c.to_unit as { name: string; abbreviation: string } | null;
      return {
        id: c.id,
        fromUnitName: fromUnit?.name ?? "Unknown",
        fromUnitAbbreviation: fromUnit?.abbreviation ?? "?",
        toUnitName: toUnit?.name ?? "Unknown",
        toUnitAbbreviation: toUnit?.abbreviation ?? "?",
        factor: Number(c.factor),
        isGlobal: c.material_id == null,
      };
    });

    return {
      profile,
      suppliers,
      stock,
      uomConversions,
      openPoCount: openPoRes.count ?? 0,
      units: (unitsRes.data ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        abbreviation: u.abbreviation,
      })),
      allSuppliers: (allSuppliersRes.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
      })),
      categories: (categoriesRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
      })),
    };
  },
);
