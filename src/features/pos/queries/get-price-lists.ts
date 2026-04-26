import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { PriceListData, PriceListRow } from "@/features/pos/types/management";

/**
 * RSC query — all price_lists for /management/pos/price-lists.
 *
 * Schema ref: init_schema.sql:2264 — price_lists
 * RLS: SELECT requires fresh claims; INSERT pos:c, UPDATE pos:u (init_schema.sql:2418-2424)
 *
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getPriceLists = cache(
  async (client: SupabaseClient<Database>): Promise<PriceListData> => {
    const { data, error } = await client
      .from("price_lists")
      .select("id, name, currency, valid_from, valid_to, is_default, created_at")
      .order("valid_from", { ascending: false });

    if (error) throw error;

    const rows: PriceListRow[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      currency: r.currency ?? "MYR",
      validFrom: r.valid_from,
      validTo: r.valid_to ?? null,
      isDefault: r.is_default ?? false,
      createdAt: r.created_at,
    }));

    return { rows };
  },
);
