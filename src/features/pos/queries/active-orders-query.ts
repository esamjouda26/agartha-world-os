import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { KdsOrder } from "@/features/pos/types";
import { KDS_OVERDUE_MS } from "@/features/pos/constants";

/** Query key constant for active-orders — shared between RSC prefetch and client useQuery. */
export const ACTIVE_ORDERS_QUERY_KEY = ["active-orders"] as const;

/**
 * Fetcher shared between RSC (server client) and client useQuery (browser client).
 * Explicit column projection — no select('*') (prompt.md Absolute Rule #21).
 * init_schema.sql:3022 — orders, init_schema.sql:3038 — order_items,
 * init_schema.sql:3092 — order_item_modifiers
 */
export async function fetchActiveOrders(
  client: SupabaseClient<Database>,
): Promise<ReadonlyArray<KdsOrder>> {
  const { data, error } = await client
    .from("orders")
    .select(
      "id, created_at, pos_point_id, pos_points(display_name), order_items(id, quantity, materials(name), order_item_modifiers(option_name))",
    )
    .eq("status", "preparing")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const now = Date.now();
  return (data ?? []).map((o) => {
    const createdMs = new Date(o.created_at).getTime();
    const elapsedMs = now - createdMs;
    const posPoint = o.pos_points as { display_name: string } | null;
    const items = (o.order_items ?? []).map((oi) => {
      const mat = oi.materials as { name: string } | null;
      return {
        id: oi.id,
        materialName: mat?.name ?? "Unknown item",
        quantity: oi.quantity,
        modifiers: (oi.order_item_modifiers ?? []).map((m) => ({ optionName: m.option_name })),
      };
    });
    return {
      id: o.id,
      shortId: o.id.slice(0, 8).toUpperCase(),
      posPointName: posPoint?.display_name ?? "—",
      createdAt: o.created_at,
      elapsedMs,
      isOverdue: elapsedMs > KDS_OVERDUE_MS,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      items,
    };
  });
}
