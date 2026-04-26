import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  PriceListDetailData,
  PriceListItemRow,
  PriceListRow,
} from "@/features/pos/types/management";

/**
 * RSC query — all data for /management/pos/price-lists/[id].
 *
 * Schema refs:
 *   init_schema.sql:2264 — price_lists
 *   init_schema.sql:2277 — price_list_items
 *   init_schema.sql:1079 — pos_points
 *   init_schema.sql:2129 — materials
 *
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getPriceListDetail = cache(
  async (
    client: SupabaseClient<Database>,
    priceListId: string,
  ): Promise<PriceListDetailData | null> => {
    const [priceListResult, itemsResult, materialsResult, posPointsResult] = await Promise.all([
      client
        .from("price_lists")
        .select("id, name, currency, valid_from, valid_to, is_default, created_at")
        .eq("id", priceListId)
        .maybeSingle(),

      client
        .from("price_list_items")
        .select(
          "id, price_list_id, material_id, pos_point_id, unit_price, min_qty, materials!price_list_items_material_id_fkey(name), pos_points!price_list_items_pos_point_id_fkey(display_name)",
        )
        .eq("price_list_id", priceListId)
        .order("created_at", { ascending: true }),

      client
        .from("materials")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),

      client
        .from("pos_points")
        .select("id, display_name")
        .order("name", { ascending: true }),
    ]);

    if (priceListResult.error) throw priceListResult.error;
    if (!priceListResult.data) return null;
    if (itemsResult.error) throw itemsResult.error;
    if (materialsResult.error) throw materialsResult.error;
    if (posPointsResult.error) throw posPointsResult.error;

    const pl = priceListResult.data;
    const priceList: PriceListRow = {
      id: pl.id,
      name: pl.name,
      currency: pl.currency ?? "MYR",
      validFrom: pl.valid_from,
      validTo: pl.valid_to ?? null,
      isDefault: pl.is_default ?? false,
      createdAt: pl.created_at,
    };

    const items: PriceListItemRow[] = (itemsResult.data ?? []).map((r) => {
      const mat = r.materials as { name: string } | null;
      const pp = r.pos_points as { display_name: string } | null;
      return {
        id: r.id,
        priceListId: r.price_list_id,
        materialId: r.material_id,
        materialName: mat?.name ?? "Unknown",
        posPointId: r.pos_point_id ?? null,
        posPointName: pp?.display_name ?? null,
        // DB NUMERIC → integer cents
        unitPrice: Math.round(Number(r.unit_price) * 100),
        minQty: Number(r.min_qty ?? 1),
      };
    });

    return {
      priceList,
      items,
      materials: (materialsResult.data ?? []).map((m) => ({ id: m.id, name: m.name })),
      posPoints: (posPointsResult.data ?? []).map((p) => ({
        id: p.id,
        displayName: p.display_name,
      })),
    };
  },
);
