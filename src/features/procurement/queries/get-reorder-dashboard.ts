import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  ReorderDashboardData,
  ReorderRow,
  ReorderKpis,
} from "@/features/procurement/types";

/**
 * RSC query — all data for /management/procurement/reorder.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/reorder`
 *   Data from: rpc_reorder_dashboard()
 *   KPIs: Items below reorder | Estimated order value | Suppliers affected
 *   Locations dropdown for "Create Draft POs" dialog
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * WF-9: Purchase Order Lifecycle — Reorder Dashboard section.
 */
export const getReorderDashboard = cache(
  async (
    client: SupabaseClient<Database>,
  ): Promise<ReorderDashboardData> => {
    // ── 1. RPC call ──────────────────────────────────────────────
    const [rpcResult, locationsResult, categoriesResult] = await Promise.all([
      client.rpc("rpc_reorder_dashboard"),
      client
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      client
        .from("material_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (rpcResult.error) throw rpcResult.error;

    // ── 2. Map rows ──────────────────────────────────────────────
    const rawRows = (rpcResult.data ?? []) as Array<{
      material_id: string;
      material_name: string;
      material_sku: string | null;
      category_id: string | null;
      category_name: string | null;
      default_supplier_id: string | null;
      default_supplier_name: string | null;
      sell_through_30d: number;
      on_hand: number;
      on_order: number;
      effective_stock: number;
      reorder_point: number;
      reorder_amt: number;
      cost_price: number | null;
      purchase_unit_abbr: string | null;
    }>;

    const rows: ReorderRow[] = rawRows.map((r) => ({
      materialId: r.material_id,
      materialName: r.material_name,
      materialSku: r.material_sku,
      categoryId: r.category_id,
      categoryName: r.category_name,
      defaultSupplierId: r.default_supplier_id,
      defaultSupplierName: r.default_supplier_name,
      sellThrough30d: Number(r.sell_through_30d),
      onHand: Number(r.on_hand),
      onOrder: Number(r.on_order),
      effectiveStock: Number(r.effective_stock),
      reorderPoint: Number(r.reorder_point),
      reorderAmt: Number(r.reorder_amt),
      costPrice: r.cost_price != null ? Number(r.cost_price) : null,
      purchaseUnitAbbr: r.purchase_unit_abbr,
    }));

    // ── 3. Compute KPIs ──────────────────────────────────────────
    const belowReorder = rows.filter((r) => r.reorderAmt > 0);
    const uniqueSuppliers = new Set(
      belowReorder
        .filter((r) => r.defaultSupplierId)
        .map((r) => r.defaultSupplierId),
    );
    const estimatedValue = belowReorder.reduce(
      (sum, r) => sum + r.reorderAmt * (r.costPrice ?? 0),
      0,
    );

    const kpis: ReorderKpis = {
      belowReorderCount: belowReorder.length,
      estimatedOrderValue: estimatedValue,
      suppliersAffected: uniqueSuppliers.size,
    };

    // ── 4. Locations + Categories ─────────────────────────────────
    const locations = (locationsResult.data ?? []).map((l) => ({
      id: l.id,
      name: l.name,
    }));

    const categories = (categoriesResult.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
    }));

    return { rows, kpis, locations, categories };
  },
);
