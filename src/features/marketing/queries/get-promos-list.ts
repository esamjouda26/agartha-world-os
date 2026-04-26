import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { PromoCodeRow, PromoListData, PromoTabKey } from "@/features/marketing/types";
import { classifyPromo } from "@/features/marketing/utils/promo-status";

/**
 * Fetch promo-code list, junction-mapped tiers, campaign options, and
 * tier options for /management/marketing/promos.
 *
 * `cache()` per ADR-0006 — request-scoped dedup only. Three RLS-scoped
 * SELECTs (promo_codes + nested junction, campaigns, tiers) — RLS Tier-3
 * marketing per init_schema.sql:3779-3799.
 */
export const getPromosList = cache(
  async (client: SupabaseClient<Database>): Promise<PromoListData> => {
    const [promosRes, campaignsRes, tiersRes] = await Promise.all([
      client
        .from("promo_codes")
        .select(
          "id, code, description, discount_type, discount_value, max_uses, current_uses, campaign_id, status, valid_from, valid_to, valid_days_mask, valid_time_start, valid_time_end, min_group_size, campaign:campaigns(id, name), promo_valid_tiers(tier_id, tier:tiers(id, name))",
        )
        .order("created_at", { ascending: false }),
      client.from("campaigns").select("id, name").order("name"),
      client.from("tiers").select("id, name").order("sort_order"),
    ]);

    if (promosRes.error) throw promosRes.error;
    if (campaignsRes.error) throw campaignsRes.error;
    if (tiersRes.error) throw tiersRes.error;

    const now = Date.now();

    const rows: PromoCodeRow[] = (promosRes.data ?? []).map((p) => {
      const links = p.promo_valid_tiers ?? [];
      const tierIds: string[] = [];
      const tierNames: string[] = [];
      for (const link of links) {
        tierIds.push(link.tier_id);
        if (link.tier?.name) tierNames.push(link.tier.name);
      }
      return {
        id: p.id,
        code: p.code,
        description: p.description,
        discountType: p.discount_type,
        discountValue: p.discount_value,
        maxUses: p.max_uses,
        currentUses: p.current_uses ?? 0,
        campaignId: p.campaign_id,
        campaignName: p.campaign?.name ?? null,
        status: p.status ?? "draft",
        validFrom: p.valid_from,
        validTo: p.valid_to,
        validDaysMask: p.valid_days_mask,
        validTimeStart: p.valid_time_start,
        validTimeEnd: p.valid_time_end,
        minGroupSize: p.min_group_size ?? 1,
        tierIds,
        tierNames,
      };
    });

    const counts: Record<PromoTabKey, number> = {
      draft: 0,
      active: 0,
      expired: 0,
      paused: 0,
    };

    for (const r of rows) {
      counts[classifyPromo(r, now)] += 1;
    }

    return {
      rows,
      counts,
      campaigns: (campaignsRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
      })),
      tiers: (tiersRes.data ?? []).map((t) => ({ id: t.id, name: t.name })),
    };
  },
);
