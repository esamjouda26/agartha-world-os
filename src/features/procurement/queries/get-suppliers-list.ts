import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  SupplierRow,
  SupplierKpis,
  SupplierListData,
} from "@/features/procurement/types";

/**
 * RSC query — all data for /management/procurement/suppliers.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/suppliers`
 *   RSC fetches: suppliers, COUNT material_procurement_data per supplier
 *   KPI: Active, Inactive, Open POs, Avg actual lead time
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup.
 */
export const getSuppliersList = cache(
  async (client: SupabaseClient<Database>): Promise<SupplierListData> => {
    // ── Parallel fetches ──────────────────────────────────────────
    const [suppliersResult, mpdResult, posResult, leadTimeResult] =
      await Promise.all([
        // All suppliers
        client
          .from("suppliers")
          .select("id, name, contact_email, contact_phone, address, description, is_active")
          .order("name", { ascending: true }),

        // Material counts per supplier
        client.from("material_procurement_data").select("supplier_id"),

        // POs: open status + last order date per supplier
        client
          .from("purchase_orders")
          .select("id, supplier_id, status, order_date"),

        // Avg actual lead time: PO order_date → first linked goods_movement date
        // We fetch POs + their first goods movement per PO
        client
          .from("purchase_orders")
          .select("order_date, goods_movements ( document_date )")
          .not("order_date", "is", null),
      ]);

    const rawSuppliers = suppliersResult.data ?? [];

    // ── Count materials per supplier ──────────────────────────────
    const materialCountMap = new Map<string, number>();
    for (const row of mpdResult.data ?? []) {
      materialCountMap.set(
        row.supplier_id,
        (materialCountMap.get(row.supplier_id) ?? 0) + 1,
      );
    }

    // ── Count open POs + last order date per supplier ─────────────
    const openStatuses = new Set(["draft", "sent", "partially_received"]);
    const openPoMap = new Map<string, number>();
    const lastOrderMap = new Map<string, string>();
    for (const po of posResult.data ?? []) {
      if (openStatuses.has(po.status ?? "")) {
        openPoMap.set(
          po.supplier_id,
          (openPoMap.get(po.supplier_id) ?? 0) + 1,
        );
      }
      if (po.order_date) {
        const existing = lastOrderMap.get(po.supplier_id);
        if (!existing || po.order_date > existing) {
          lastOrderMap.set(po.supplier_id, po.order_date);
        }
      }
    }

    // ── Compute avg actual lead time ─────────────────────────────
    let totalLeadDays = 0;
    let leadSamples = 0;
    for (const po of leadTimeResult.data ?? []) {
      if (!po.order_date) continue;
      const gms = po.goods_movements as
        | Array<{ document_date: string | null }>
        | null;
      if (!gms || gms.length === 0) continue;
      // First goods movement date
      const earliest = gms
        .map((g) => g.document_date)
        .filter((d): d is string => d != null)
        .sort()[0];
      if (!earliest) continue;
      const diffMs =
        new Date(earliest).getTime() - new Date(po.order_date).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        totalLeadDays += diffDays;
        leadSamples++;
      }
    }

    // ── Map suppliers ────────────────────────────────────────────
    const suppliers: SupplierRow[] = rawSuppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactEmail: s.contact_email,
      contactPhone: s.contact_phone,
      address: s.address,
      description: s.description,
      isActive: s.is_active ?? true,
      materialCount: materialCountMap.get(s.id) ?? 0,
      openPoCount: openPoMap.get(s.id) ?? 0,
      lastOrderDate: lastOrderMap.get(s.id) ?? null,
    }));

    // ── KPIs ─────────────────────────────────────────────────────
    let totalOpenPOs = 0;
    for (const count of openPoMap.values()) totalOpenPOs += count;

    const kpis: SupplierKpis = {
      activeCount: suppliers.filter((s) => s.isActive).length,
      inactiveCount: suppliers.filter((s) => !s.isActive).length,
      openPoCount: totalOpenPOs,
      avgActualLeadTimeDays:
        leadSamples > 0 ? Math.round(totalLeadDays / leadSamples) : null,
    };

    return { suppliers, kpis };
  },
);
