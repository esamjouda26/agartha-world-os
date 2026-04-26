import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { CampaignListData, CampaignRow, LifecycleStatus } from "@/features/marketing/types";

/**
 * Fetch the campaigns list for /management/marketing/campaigns.
 *
 * RSC-only fetcher; cache(): per-request dedup (ADR-0006). Pulls
 * `campaigns` (init_schema.sql:3715) plus a per-row aggregate of
 * `promo_codes.current_uses` so KPIs and the redemption column share
 * one round trip. PostgREST's nested aggregate join (`promo_codes(...)`)
 * keeps RLS in scope on both tables — Tier-3 marketing per
 * init_schema.sql:3768-3787.
 */
export const getCampaignsList = cache(
  async (client: SupabaseClient<Database>): Promise<CampaignListData> => {
    const { data, error } = await client
      .from("campaigns")
      .select(
        "id, name, description, status, budget, start_date, end_date, created_at, promo_codes(id, current_uses)",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows: CampaignRow[] = (data ?? []).map((c) => {
      const promos = c.promo_codes ?? [];
      const totalRedemptions = promos.reduce((sum, p) => sum + (p.current_uses ?? 0), 0);
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        status: c.status ?? "draft",
        budget: c.budget,
        startDate: c.start_date,
        endDate: c.end_date,
        promoCount: promos.length,
        totalRedemptions,
        createdAt: c.created_at,
      };
    });

    const counts: Record<LifecycleStatus, number> = {
      draft: 0,
      active: 0,
      paused: 0,
      completed: 0,
    };
    for (const r of rows) counts[r.status] += 1;

    const totalPromos = rows.reduce((sum, r) => sum + r.promoCount, 0);
    const totalRedemptions = rows.reduce((sum, r) => sum + r.totalRedemptions, 0);
    const totalBudget = rows.reduce((sum, r) => sum + (r.budget ?? 0), 0);

    return {
      rows,
      counts,
      kpis: {
        activeCount: counts.active,
        totalPromos,
        totalRedemptions,
        totalBudget,
      },
    };
  },
);
