import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  MaterialRow,
  MaterialKpis,
  MaterialListData,
} from "@/features/procurement/types";

/**
 * RSC query — all data for /management/procurement (material list).
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * Tier 1 RLS on materials (all authenticated can read).
 * Tier 3 RLS on material_procurement_data (procurement:r).
 */
export const getMaterialsList = cache(
  async (client: SupabaseClient<Database>): Promise<MaterialListData> => {
    // ── 1. Materials + category + unit + default supplier ──────────────
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
        is_active,
        material_categories!materials_category_id_fkey ( name ),
        units!materials_base_unit_id_fkey ( abbreviation )
        `,
      )
      .order("name", { ascending: true });
    if (matErr) throw matErr;

    // ── 2. Default supplier per material ──────────────────────────────
    const { data: rawProcData, error: procErr } = await client
      .from("material_procurement_data")
      .select(
        `
        material_id,
        lead_time_days,
        is_default,
        suppliers ( name )
        `,
      )
      .eq("is_default", true);
    if (procErr) throw procErr;

    const defaultSupplierMap = new Map<
      string,
      { supplierName: string; leadTimeDays: number }
    >();
    for (const pd of rawProcData ?? []) {
      const supplier = pd.suppliers as { name: string } | null;
      defaultSupplierMap.set(pd.material_id, {
        supplierName: supplier?.name ?? "",
        leadTimeDays: pd.lead_time_days ?? 0,
      });
    }

    // ── 3. Stock on-hand aggregate per material ───────────────────────
    const { data: rawStock, error: stockErr } = await client
      .from("stock_balance_cache")
      .select("material_id, current_qty");
    if (stockErr) throw stockErr;

    const stockMap = new Map<string, number>();
    for (const sb of rawStock ?? []) {
      stockMap.set(
        sb.material_id,
        (stockMap.get(sb.material_id) ?? 0) + Number(sb.current_qty),
      );
    }

    // ── 4. Materials with open PO lines (status in draft/sent/partially_received) ──
    const { data: rawOpenPo, error: poErr } = await client
      .from("purchase_order_items")
      .select(
        `
        material_id,
        purchase_orders!inner ( status )
        `,
      )
      .in("purchase_orders.status", ["draft", "sent", "partially_received"]);
    if (poErr) throw poErr;

    const onOrderMaterialIds = new Set<string>();
    for (const poi of rawOpenPo ?? []) {
      onOrderMaterialIds.add(poi.material_id);
    }

    // ── 5. Categories for filters ─────────────────────────────────────
    const { data: rawCats, error: catErr } = await client
      .from("material_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (catErr) throw catErr;

    const categories = (rawCats ?? []).map((c) => ({ id: c.id, name: c.name }));

    // ── 6. Map to view types + compute KPIs ───────────────────────────
    let needsOrderingCount = 0;
    let noSupplierCount = 0;
    let onOrderCount = 0;
    let leadTimeSum = 0;
    let leadTimeCount = 0;

    const materials: MaterialRow[] = (rawMaterials ?? []).map((m) => {
      const cat = m.material_categories as { name: string } | null;
      const unit = m.units as { abbreviation: string } | null;
      const procData = defaultSupplierMap.get(m.id);
      const onHand = stockMap.get(m.id) ?? 0;
      const reorderPoint = Number(m.reorder_point ?? 0);
      const needsReorder = onHand <= reorderPoint && reorderPoint > 0;
      const hasOpenPo = onOrderMaterialIds.has(m.id);

      // KPI accumulation
      if (needsReorder) needsOrderingCount++;
      if (!procData) noSupplierCount++;
      if (hasOpenPo) onOrderCount++;
      if (procData && procData.leadTimeDays > 0) {
        leadTimeSum += procData.leadTimeDays;
        leadTimeCount++;
      }

      return {
        id: m.id,
        name: m.name,
        sku: m.sku,
        materialType: m.material_type,
        categoryName: cat?.name ?? null,
        categoryId: m.category_id,
        baseUnitAbbreviation: unit?.abbreviation ?? null,
        baseUnitId: m.base_unit_id,
        defaultSupplierName: procData?.supplierName ?? null,
        defaultSupplierLeadTimeDays: procData?.leadTimeDays ?? null,
        onHand,
        reorderPoint,
        needsReorder,
        hasOpenPo,
        isActive: m.is_active ?? true,
      };
    });

    const kpis: MaterialKpis = {
      needsOrderingCount,
      noSupplierCount,
      onOrderCount,
      avgLeadTimeDays:
        leadTimeCount > 0 ? Math.round(leadTimeSum / leadTimeCount) : null,
    };

    return { materials, kpis, categories };
  },
);
