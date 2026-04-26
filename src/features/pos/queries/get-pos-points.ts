import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { PosPointsData, PosPointRow } from "@/features/pos/types/management";

/**
 * RSC query — all data for /management/pos (POS Points list).
 *
 * Joins pos_points → locations, then merges stats from v_pos_point_today_stats
 * in memory (views don't carry FK declarations so PostgREST can't auto-join).
 * Two queries → no N+1; preamble §"Aggregate query discipline" requires the
 * aggregate to come from the view, not per-row sub-queries.
 *
 * Schema refs:
 *   init_schema.sql:1079  — pos_points
 *   phase2_security_additions.sql:180 — v_pos_point_today_stats
 *   init_schema.sql:3022  — orders (referenced by view, not queried here)
 *
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getPosPoints = cache(
  async (client: SupabaseClient<Database>): Promise<PosPointsData> => {
    const [pointsResult, statsResult, locationsResult] = await Promise.all([
      client
        .from("pos_points")
        .select("id, name, display_name, location_id, is_active, created_at, locations!pos_points_location_id_fkey ( name )")
        .order("name", { ascending: true }),
      client
        .from("v_pos_point_today_stats")
        .select("pos_point_id, order_count_today, revenue_today, last_order_at"),
      client
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (pointsResult.error) throw pointsResult.error;
    if (statsResult.error) throw statsResult.error;
    if (locationsResult.error) throw locationsResult.error;

    const statsMap = new Map(
      (statsResult.data ?? []).map((s) => [s.pos_point_id as string, s]),
    );

    let ordersToday = 0;
    let revenueTodayCents = 0;
    let activeCount = 0;

    const rows: PosPointRow[] = (pointsResult.data ?? []).map((p) => {
      const stats = statsMap.get(p.id);
      const location = p.locations as { name: string } | null;
      const orderCount = Number(stats?.order_count_today ?? 0);
      // DB NUMERIC(12,2) → integer cents
      const revenueCents = Math.round(Number(stats?.revenue_today ?? 0) * 100);

      ordersToday += orderCount;
      revenueTodayCents += revenueCents;
      if (p.is_active) activeCount++;

      return {
        id: p.id,
        name: p.name,
        displayName: p.display_name,
        locationId: p.location_id,
        locationName: location?.name ?? null,
        isActive: p.is_active ?? true,
        orderCountToday: orderCount,
        revenueToday: revenueCents,
        lastOrderAt: (stats?.last_order_at as string | null) ?? null,
        createdAt: p.created_at,
      };
    });

    return {
      rows,
      kpis: {
        activeCount,
        totalCount: rows.length,
        ordersToday,
        revenueToday: revenueTodayCents,
      },
      locations: (locationsResult.data ?? []).map((l) => ({ id: l.id, name: l.name })),
    };
  },
);
