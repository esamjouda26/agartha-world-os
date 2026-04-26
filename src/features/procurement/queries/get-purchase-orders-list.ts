import "server-only";

import { cache } from "react";
import { isAfter, isBefore, startOfDay, endOfDay, endOfWeek } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  PurchaseOrderListData,
  PurchaseOrderRow,
  PurchaseOrderKpis,
  PoStatus,
  DeliveryIndicator,
} from "@/features/procurement/types";

/**
 * RSC query — all data for /management/procurement/purchase-orders.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/purchase-orders`
 *   KPI row: "Open PO value: ${total}" | "Due this week: {n}" | "Overdue: {n}"
 *   RSC fetches: purchase_orders JOIN suppliers (name) JOIN locations (name),
 *                COUNT purchase_order_items
 */
export const getPurchaseOrdersList = cache(
  async (client: SupabaseClient<Database>): Promise<PurchaseOrderListData> => {
    // ── 1. Parallel fetches ───────────────────────────────────────
    const [posResult, suppliersResult, locationsResult] = await Promise.all([
      client
        .from("purchase_orders")
        .select(
          `
          id,
          supplier_id,
          receiving_location_id,
          status,
          order_date,
          expected_delivery_date,
          notes,
          created_at,
          suppliers ( id, name ),
          locations ( id, name ),
          purchase_order_items ( expected_qty, unit_price )
          `,
        )
        .order("created_at", { ascending: false }),

      client
        .from("suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),

      client
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (posResult.error) throw posResult.error;

    // ── 2. Dates for KPI calculations ─────────────────────────────
    const now = new Date();
    const today = startOfDay(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Mon-based week

    // ── 3. Map rows + compute KPIs ────────────────────────────────
    const statusCounts: Record<PoStatus, number> = {
      draft: 0,
      sent: 0,
      partially_received: 0,
      completed: 0,
      cancelled: 0,
    };

    let openPoValue = 0;
    let dueThisWeekCount = 0;
    let overdueCount = 0;

    const orders: PurchaseOrderRow[] = (posResult.data ?? []).map((po) => {
      const supplier = po.suppliers as { id: string; name: string } | null;
      const location = po.locations as { id: string; name: string } | null;
      const items = (po.purchase_order_items ?? []) as Array<{
        expected_qty: number;
        unit_price: number;
      }>;

      const status = (po.status ?? "draft") as PoStatus;
      const itemCount = items.length;
      const totalValue = items.reduce(
        (sum, i) => sum + Number(i.expected_qty) * Number(i.unit_price),
        0,
      );

      // Status counts
      statusCounts[status]++;

      // Delivery indicator
      let deliveryIndicator: DeliveryIndicator = "none";
      const isOpen = status === "sent" || status === "partially_received";

      if (isOpen && po.expected_delivery_date) {
        const dueDate = startOfDay(new Date(po.expected_delivery_date));
        if (isBefore(dueDate, today)) {
          deliveryIndicator = "overdue";
          overdueCount++;
        } else if (!isAfter(dueDate, endOfDay(weekEnd))) {
          deliveryIndicator = "due_soon";
          dueThisWeekCount++;
        } else {
          deliveryIndicator = "on_time";
        }
      }

      // KPI: open PO value (draft + sent + partially_received)
      if (status === "draft" || status === "sent" || status === "partially_received") {
        openPoValue += totalValue;
      }

      return {
        id: po.id,
        supplierName: supplier?.name ?? "Unknown",
        supplierId: po.supplier_id,
        status,
        orderDate: po.order_date,
        expectedDeliveryDate: po.expected_delivery_date,
        receivingLocationName: location?.name ?? null,
        itemCount,
        totalValue,
        deliveryIndicator,
        createdAt: po.created_at,
      };
    });

    // ── 4. Assemble KPIs ──────────────────────────────────────────
    const kpis: PurchaseOrderKpis = {
      openPoValue,
      dueThisWeekCount,
      overdueCount,
    };

    return {
      orders,
      kpis,
      statusCounts,
      suppliers: (suppliersResult.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
      })),
      locations: (locationsResult.data ?? []).map((l) => ({
        id: l.id,
        name: l.name,
      })),
    };
  },
);
