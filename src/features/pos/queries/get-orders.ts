import "server-only";

import { cache } from "react";
import { startOfDay, endOfDay, subDays } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { OrderRow, OrdersData, OrdersKpis } from "@/features/pos/types/management";
import { parseIsoDateLocal } from "@/lib/date";

const PAGE_SIZE_DEFAULT = 25;

/**
 * RSC query — orders for /management/pos/orders.
 *
 * Schema refs:
 *   init_schema.sql:3022  — orders
 *   init_schema.sql:3038  — order_items
 *   init_schema.sql:3092  — order_item_modifiers
 *   init_schema.sql:1079  — pos_points
 *   init_schema.sql:2129  — materials
 *
 * For the "preparing" status, fetches all (small live set).
 * For "completed"/"cancelled": keyset cursor pagination
 * (created_at DESC, id DESC — stable sort for live data).
 *
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getOrders = cache(
  async (
    client: SupabaseClient<Database>,
    opts: {
      status: "preparing" | "completed" | "cancelled";
      posPointId?: string;
      startDate?: string;
      endDate?: string;
      cursor?: string;
      pageSize?: number;
      /** Search by order short-id prefix (case-insensitive). */
      q?: string;
    },
  ): Promise<OrdersData & { nextCursorToken: string | null }> => {
    const { status, posPointId, startDate, endDate, cursor, q, pageSize = PAGE_SIZE_DEFAULT } = opts;

    // KPIs follow the active date range filter. When the URL has no
    // `from`/`to`, fall back to "today" — matches frontend_spec.md:1133
    // ("Completed today") for the unfiltered default while letting users
    // re-scope all four KPIs by selecting any range.
    const kpiRangeStart = (
      startDate ? startOfDay(parseIsoDateLocal(startDate)) : startOfDay(new Date())
    ).toISOString();
    const kpiRangeEnd = (
      endDate ? endOfDay(parseIsoDateLocal(endDate)) : endOfDay(new Date())
    ).toISOString();

    // ── KPI queries (parallel with main query) ───────────────────────
    const [mainResult, kpiPreparingResult, kpiCompletedResult, posPointsResult] =
      await Promise.all([
        buildMainQuery(client, {
          status,
          ...(posPointId !== undefined ? { posPointId } : {}),
          ...(startDate !== undefined ? { startDate } : {}),
          ...(endDate !== undefined ? { endDate } : {}),
          ...(cursor !== undefined ? { cursor } : {}),
          ...(q !== undefined ? { q } : {}),
          pageSize,
        }),

        client
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "preparing"),

        // Completed orders within the active KPI range (filter-driven, not
        // hardcoded to today). Optional posPointId filter narrows further.
        (() => {
          let q = client
            .from("orders")
            .select("id, total_amount, created_at, completed_at")
            .eq("status", "completed")
            .gte("created_at", kpiRangeStart)
            .lte("created_at", kpiRangeEnd);
          if (posPointId) q = q.eq("pos_point_id", posPointId);
          return q;
        })(),

        client
          .from("pos_points")
          .select("id, display_name")
          .order("name", { ascending: true }),
      ]);

    if (mainResult.error) throw mainResult.error;
    if (posPointsResult.error) throw posPointsResult.error;

    const completedInRange = kpiCompletedResult.data ?? [];
    const avgTicket =
      completedInRange.length > 0
        ? Math.round(
            (completedInRange.reduce((sum, o) => sum + Number(o.total_amount), 0) /
              completedInRange.length) *
              100,
          )
        : 0;

    // Avg prep time (seconds) for orders completed within the KPI range.
    const prepTimes = completedInRange
      .filter((o) => o.completed_at)
      .map((o) =>
        Math.max(
          0,
          (new Date(o.completed_at as string).getTime() -
            new Date(o.created_at).getTime()) /
            1000,
        ),
      );
    const avgPrepSeconds =
      prepTimes.length > 0
        ? Math.round(prepTimes.reduce((sum, s) => sum + s, 0) / prepTimes.length)
        : 0;

    const kpis: OrdersKpis = {
      preparingCount: kpiPreparingResult.count ?? 0,
      completedToday: completedInRange.length,
      avgTicket,
      avgPrepSeconds,
    };

    const rows: OrderRow[] = (mainResult.data ?? []).map((o) => {
      const pp = o.pos_points as { display_name: string } | null;
      const items = (o.order_items ?? []).map((oi) => {
        const mat = oi.materials as { name: string } | null;
        return {
          id: oi.id,
          materialName: mat?.name ?? "Unknown",
          quantity: Number(oi.quantity),
          modifiers: (oi.order_item_modifiers ?? []).map((m) => ({
            optionName: m.option_name,
          })),
        };
      });

      return {
        id: o.id,
        shortId: o.id.slice(0, 8).toUpperCase(),
        posPointId: o.pos_point_id,
        posPointName: pp?.display_name ?? "—",
        status: o.status ?? "preparing",
        totalAmount: Math.round(Number(o.total_amount) * 100),
        paymentMethod: o.payment_method ?? null,
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        createdAt: o.created_at,
        completedAt: o.completed_at ?? null,
        items,
      };
    });

    // Next cursor = last row's (created_at|id) when we got a full page
    let nextCursorToken: string | null = null;
    if (rows.length === pageSize + 1) {
      rows.pop(); // remove sentinel
      const last = rows[rows.length - 1];
      if (last) nextCursorToken = `${last.createdAt}|${last.id}`;
    }

    return {
      rows,
      kpis,
      posPoints: (posPointsResult.data ?? []).map((p) => ({
        id: p.id,
        displayName: p.display_name,
      })),
      nextCursorToken,
    };
  },
);

async function buildMainQuery(
  client: SupabaseClient<Database>,
  opts: {
    status: "preparing" | "completed" | "cancelled";
    posPointId?: string;
    startDate?: string;
    endDate?: string;
    cursor?: string;
    pageSize: number;
    q?: string;
  },
) {
  const { status, posPointId, startDate, endDate, cursor, pageSize, q } = opts;

  let query = client
    .from("orders")
    .select(
      "id, pos_point_id, status, total_amount, payment_method, created_at, completed_at, pos_points!orders_pos_point_id_fkey(display_name), order_items(id, quantity, materials!order_items_material_id_fkey(name), order_item_modifiers(option_name))",
    )
    .eq("status", status);

  if (posPointId) query = query.eq("pos_point_id", posPointId);

  // q is consumed client-side (filters loaded page by short order id) —
  // PostgREST can't ilike a UUID column without a cast we don't control.
  void q;

  if (status === "preparing") {
    query = query.order("created_at", { ascending: true });
  } else {
    // Completed/Cancelled: newest first with cursor pagination
    const effectiveStart = startDate ?? subDays(new Date(), 7).toISOString();
    query = query.gte("created_at", effectiveStart);
    if (endDate) query = query.lte("created_at", endDate);

    if (cursor) {
      const [cursorDate, cursorId] = cursor.split("|");
      if (cursorDate && cursorId) {
        // Keyset: rows before this cursor (DESC order)
        query = query.or(`created_at.lt.${cursorDate},and(created_at.eq.${cursorDate},id.lt.${cursorId})`);
      }
    }

    // Fetch pageSize + 1 to determine if there's a next page
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);
  }

  return query;
}
