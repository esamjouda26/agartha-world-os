import "server-only";

import { cache } from "react";
import { addDays, addMonths } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  CostsDashboardData,
  WasteReasonItem,
  WastedMaterialItem,
  DailyWaste,
  StockByLocation,
  StockByType,
} from "@/features/costs/types/costs";

const REASON_LABELS: Record<string, string> = {
  expired: "Expired",
  damaged: "Damaged",
  contaminated: "Contaminated",
  preparation_error: "Preparation Error",
  overproduction: "Overproduction",
  quality_defect: "Quality Defect",
};

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  raw: "Raw",
  semi_finished: "Semi-Finished",
  finished: "Finished",
  trading: "Trading",
  consumable: "Consumable",
  service: "Service",
};

export function resolvePeriodBounds(params: { range?: string | null }): {
  from: string;
  to: string;
} {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0]!;
  const to = fmt(today);
  switch (params.range) {
    case "7d":
      return { from: fmt(addDays(today, -6)), to };
    case "90d":
      return { from: fmt(addMonths(today, -3)), to };
    case "30d":
    default:
      return { from: fmt(addDays(today, -29)), to };
  }
}

/**
 * RSC query — Cost & Waste dashboard.
 * COGS requires 2 sequential queries (find movement_type_id, then items).
 * Everything else is parallel.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getCostsDashboard = cache(
  async (
    client: SupabaseClient<Database>,
    bounds: { from: string; to: string },
  ): Promise<CostsDashboardData> => {
    const fromTs = `${bounds.from}T00:00:00.000Z`;
    const toTs = `${bounds.to}T23:59:59.999Z`;

    // ── Parallel root queries ────────────────────────────────────────
    const [writeOffsResult, stockResult, cogsTypeResult] = await Promise.all([
      // 1. Write-offs for period with material name
      client
        .from("write_offs")
        .select(
          "id, reason, quantity, total_cost, material_id, created_at, materials!write_offs_material_id_fkey ( name )",
        )
        .gte("created_at", fromTs)
        .lte("created_at", toTs),

      // 2. Stock balance with location + material_type
      client
        .from("stock_balance_cache")
        .select(
          "stock_value, material_id, location_id, locations!stock_balance_cache_location_id_fkey ( name ), materials!stock_balance_cache_material_id_fkey ( material_type )",
        ),

      // 3. Find COGS movement type
      client.from("movement_types").select("id").eq("code", "601").maybeSingle(),
    ]);

    if (writeOffsResult.error) throw writeOffsResult.error;
    if (stockResult.error) throw stockResult.error;
    if (cogsTypeResult.error) throw cogsTypeResult.error;

    // ── COGS: sequential step ────────────────────────────────────────
    let totalCogs = 0;
    if (cogsTypeResult.data) {
      const { data: cogsMoves, error: movesErr } = await client
        .from("goods_movements")
        .select("id")
        .eq("movement_type_id", cogsTypeResult.data.id)
        .gte("document_date", bounds.from)
        .lte("document_date", bounds.to);

      if (movesErr) throw movesErr;

      if (cogsMoves && cogsMoves.length > 0) {
        const moveIds = cogsMoves.map((m) => m.id);
        const { data: cogsItems, error: itemsErr } = await client
          .from("goods_movement_items")
          .select("total_cost")
          .in("goods_movement_id", moveIds);

        if (itemsErr) throw itemsErr;
        totalCogs = (cogsItems ?? []).reduce((s, r) => s + Number(r.total_cost), 0);
      }
    }

    // ── Write-offs aggregation ────────────────────────────────────────
    const writeOffs = writeOffsResult.data ?? [];
    const totalWasteCost = writeOffs.reduce((s, r) => s + Number(r.total_cost), 0);

    // By reason
    const reasonMap = new Map<string, { totalCost: number; quantity: number }>();
    for (const r of writeOffs) {
      const key = r.reason ?? "other";
      const ex = reasonMap.get(key) ?? { totalCost: 0, quantity: 0 };
      ex.totalCost += Number(r.total_cost);
      ex.quantity += Number(r.quantity);
      reasonMap.set(key, ex);
    }
    const wasteByReason: WasteReasonItem[] = Array.from(reasonMap.entries())
      .map(([reason, v]) => ({
        reason,
        label: REASON_LABELS[reason] ?? reason,
        totalCost: v.totalCost,
        quantity: v.quantity,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // Top 10 by material
    const matMap = new Map<string, { name: string; totalCost: number; quantity: number }>();
    for (const r of writeOffs) {
      const mat = r.materials as { name: string } | null;
      const ex = matMap.get(r.material_id) ?? {
        name: mat?.name ?? "Unknown",
        totalCost: 0,
        quantity: 0,
      };
      ex.totalCost += Number(r.total_cost);
      ex.quantity += Number(r.quantity);
      matMap.set(r.material_id, ex);
    }
    const topWastedMaterials: WastedMaterialItem[] = Array.from(matMap.entries())
      .map(([id, v]) => ({
        materialId: id,
        materialName: v.name,
        totalCost: v.totalCost,
        quantity: v.quantity,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    // Daily trend
    const dailyMap = new Map<string, number>();
    for (const r of writeOffs) {
      const date = r.created_at.split("T")[0]!;
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + Number(r.total_cost));
    }
    const wasteTrend: DailyWaste[] = Array.from(dailyMap.entries())
      .map(([date, totalCost]) => ({ date, totalCost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Stock aggregation ─────────────────────────────────────────────
    const stock = stockResult.data ?? [];
    const totalStockValue = stock.reduce((s, r) => s + Number(r.stock_value), 0);

    // By location
    const locMap = new Map<string, { name: string; value: number }>();
    for (const r of stock) {
      const loc = r.locations as { name: string } | null;
      const key = r.location_id;
      const ex = locMap.get(key) ?? { name: loc?.name ?? "Unknown", value: 0 };
      ex.value += Number(r.stock_value);
      locMap.set(key, ex);
    }
    const stockByLocation: StockByLocation[] = Array.from(locMap.entries())
      .map(([id, v]) => ({ locationId: id, locationName: v.name, stockValue: v.value }))
      .sort((a, b) => b.stockValue - a.stockValue);

    // By material type
    const typeMap = new Map<string, number>();
    for (const r of stock) {
      const mat = r.materials as { material_type: string } | null;
      const key = mat?.material_type ?? "unknown";
      typeMap.set(key, (typeMap.get(key) ?? 0) + Number(r.stock_value));
    }
    const stockByType: StockByType[] = Array.from(typeMap.entries())
      .map(([materialType, stockValue]) => ({
        materialType,
        label: MATERIAL_TYPE_LABELS[materialType] ?? materialType,
        stockValue,
      }))
      .sort((a, b) => b.stockValue - a.stockValue);

    return {
      periodFrom: bounds.from,
      periodTo: bounds.to,
      totalStockValue,
      totalCogs,
      totalWasteCost,
      wasteToCogsPct: totalCogs > 0 ? Math.round((totalWasteCost / totalCogs) * 1000) / 10 : null,
      wasteByReason,
      topWastedMaterials,
      wasteTrend,
      stockByLocation,
      stockByType,
    };
  },
);
