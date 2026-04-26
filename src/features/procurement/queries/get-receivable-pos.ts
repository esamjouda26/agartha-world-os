import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { RECEIVABLE_PO_LIMIT } from "@/features/procurement/constants";
import type { PoItemView, ReceivablePoRow } from "@/features/procurement/types";

/**
 * Loads all purchase orders in 'sent' or 'partially_received' status, joined
 * with supplier name and line items, for the crew PO receiving page.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * RLS-scoped; incompatible with `unstable_cache` without service-role client
 * that would bypass RLS.
 */
export const getReceivablePos = cache(
  async (
    client: SupabaseClient<Database>,
  ): Promise<ReadonlyArray<ReceivablePoRow>> => {
    const { data: posRaw, error: posError } = await client
      .from("purchase_orders")
      .select(
        `id,
         supplier_id,
         receiving_location_id,
         status,
         order_date,
         expected_delivery_date,
         created_at,
         suppliers(id, name),
         purchase_order_items(id, material_id, expected_qty, received_qty, unit_price, materials(name))`,
      )
      .in("status", ["sent", "partially_received"])
      .order("order_date", { ascending: true })
      .limit(RECEIVABLE_PO_LIMIT);
    if (posError) throw posError;

    return (posRaw ?? []).map((po) => {
      const supplier = po.suppliers as { id: string; name: string } | null;
      const rawItems = po.purchase_order_items ?? [];

      const items: ReadonlyArray<PoItemView> = rawItems.map((item) => {
        const mat = item.materials as { name: string } | null;
        return {
          id: item.id,
          materialId: item.material_id,
          materialName: mat?.name ?? "",
          expectedQty: item.expected_qty,
          receivedQty: item.received_qty,
          unitPrice: item.unit_price,
        };
      });

      return {
        id: po.id,
        supplierId: po.supplier_id,
        supplierName: supplier?.name ?? "",
        receivingLocationId: po.receiving_location_id,
        status: po.status,
        orderDate: po.order_date,
        expectedDeliveryDate: po.expected_delivery_date,
        createdAt: po.created_at,
        items,
      };
    });
  },
);
