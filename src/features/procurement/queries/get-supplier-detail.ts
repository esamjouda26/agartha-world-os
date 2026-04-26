import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  SupplierDetailData,
  SupplierMaterialRow,
  SupplierPoHistoryRow,
  PoStatus,
} from "@/features/procurement/types";

/**
 * RSC query — all data for /management/procurement/suppliers/[id].
 *
 * Spec: frontend_spec.md §3b `/management/procurement/suppliers/[id]`
 *   RSC fetches: suppliers WHERE id = param,
 *                material_procurement_data WHERE supplier_id JOIN materials (name, sku),
 *                purchase_orders WHERE supplier_id ORDER BY order_date DESC
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup.
 */
export const getSupplierDetail = cache(
  async (
    client: SupabaseClient<Database>,
    supplierId: string,
  ): Promise<SupplierDetailData | null> => {
    // ── Parallel fetches ──────────────────────────────────────────
    const [supplierResult, mpdResult, posResult] = await Promise.all([
      // Supplier header
      client
        .from("suppliers")
        .select(
          "id, name, contact_email, contact_phone, address, description, is_active, created_at",
        )
        .eq("id", supplierId)
        .maybeSingle(),

      // Linked materials via material_procurement_data
      client
        .from("material_procurement_data")
        .select(
          `
          material_id,
          supplier_sku,
          cost_price,
          lead_time_days,
          min_order_qty,
          is_default,
          materials ( name, sku )
          `,
        )
        .eq("supplier_id", supplierId)
        .order("is_default", { ascending: false }),

      // PO history
      client
        .from("purchase_orders")
        .select(
          `
          id,
          status,
          order_date,
          expected_delivery_date,
          locations ( name ),
          purchase_order_items ( unit_price, expected_qty )
          `,
        )
        .eq("supplier_id", supplierId)
        .order("order_date", { ascending: false })
        .limit(50),
    ]);

    // ── Bail if not found ─────────────────────────────────────────
    if (supplierResult.error || !supplierResult.data) return null;

    const s = supplierResult.data;

    // ── Map materials ─────────────────────────────────────────────
    const materials: SupplierMaterialRow[] = (mpdResult.data ?? []).map(
      (row) => {
        const mat = row.materials as { name: string; sku: string | null } | null;
        return {
          materialId: row.material_id,
          materialName: mat?.name ?? "Unknown",
          materialSku: mat?.sku ?? null,
          supplierSku: row.supplier_sku,
          costPrice: Number(row.cost_price),
          leadTimeDays: row.lead_time_days ?? 0,
          minOrderQty: Number(row.min_order_qty ?? 1),
          isDefault: row.is_default,
        };
      },
    );

    // ── Map PO history ────────────────────────────────────────────
    const poHistory: SupplierPoHistoryRow[] = (posResult.data ?? []).map(
      (po) => {
        const items = (po.purchase_order_items ?? []) as Array<{
          unit_price: number;
          expected_qty: number;
        }>;
        const totalValue = items.reduce(
          (sum, i) => sum + Number(i.unit_price) * Number(i.expected_qty),
          0,
        );
        const loc = po.locations as { name: string } | null;
        return {
          id: po.id,
          status: (po.status ?? "draft") as PoStatus,
          orderDate: po.order_date,
          expectedDeliveryDate: po.expected_delivery_date,
          totalValue,
          itemCount: items.length,
          receivingLocationName: loc?.name ?? null,
        };
      },
    );

    return {
      id: s.id,
      name: s.name,
      contactEmail: s.contact_email,
      contactPhone: s.contact_phone,
      address: s.address,
      description: s.description,
      isActive: s.is_active ?? true,
      createdAt: s.created_at,
      materials,
      poHistory,
    };
  },
);
