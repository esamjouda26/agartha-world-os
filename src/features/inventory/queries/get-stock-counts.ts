import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  ReconciliationRow,
  StockCountItemView,
} from "@/features/inventory/types";

/**
 * Loads inventory reconciliations assigned to the calling user with status
 * 'pending' or 'in_progress'.
 *
 * Blind-count model: `system_qty` is deliberately excluded from the returned
 * `StockCountItemView`. It must never reach the client component to prevent
 * anchoring bias during the physical count. System vs physical comparison
 * happens exclusively in the `updateStockCountAction` server side.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getStockCounts = cache(
  async (
    client: SupabaseClient<Database>,
    userId: string,
  ): Promise<ReadonlyArray<ReconciliationRow>> => {
    const { data: recsRaw, error: recsError } = await client
      .from("inventory_reconciliations")
      .select(
        `id,
         location_id,
         scheduled_date,
         status,
         discrepancy_found,
         crew_remark,
         locations(id, name),
         inventory_reconciliation_items(id, material_id, physical_qty, materials(name, base_unit_id, units:units!materials_base_unit_id_fkey(abbreviation)))`,
      )
      .eq("assigned_to", userId)
      .in("status", ["pending", "in_progress"])
      .order("scheduled_date", { ascending: true });
    if (recsError) throw recsError;

    return (recsRaw ?? []).map((rec) => {
      const loc = rec.locations as { id: string; name: string } | null;
      const rawItems = rec.inventory_reconciliation_items ?? [];

      const items: ReadonlyArray<StockCountItemView> = rawItems.map((item) => {
        const mat = item.materials as unknown as {
          name: string;
          base_unit_id: string;
          units: { abbreviation: string } | null;
        } | null;
        return {
          id: item.id,
          materialId: item.material_id,
          materialName: mat?.name ?? "",
          // Surface the unit abbreviation rather than the FK id so UI renders
          // without a secondary lookup.
          baseUnit: mat?.units?.abbreviation ?? "",
          physicalQty: item.physical_qty,
        };
      });

      return {
        id: rec.id,
        locationId: rec.location_id,
        locationName: loc?.name ?? "",
        scheduledDate: rec.scheduled_date,
        status: rec.status,
        discrepancyFound: rec.discrepancy_found,
        crewRemark: rec.crew_remark,
        items,
      };
    });
  },
);
