import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  InventoryTaskStatus,
  RequisitionListData,
  RequisitionListKpis,
  RequisitionListRow,
  RequisitionStatusCounts,
} from "@/features/inventory/types";

/**
 * RSC query — payload for `/management/inventory/requisitions`.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup. RLS on
 * `material_requisitions` is Tier 3b (`inventory_ops`); manager users
 * (inventory_ops:c) see all rows. The query is a single SELECT with
 * embedded resources for from/to locations, assignee profile, and item
 * aggregates done in JS — no per-row sub-queries.
 *
 * Counts + KPIs are computed in the same pass to avoid a second round
 * trip; the caller decides which tab to show via nuqs `?status=`.
 */
export const getRequisitionsList = cache(
  async (
    client: SupabaseClient<Database>,
  ): Promise<RequisitionListData> => {
    const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // ── 1. Requisitions joined with locations + assignee profile + items
    //
    // Embedded `items.materials.name` powers the spec line 2039 search
    // ("searches to_location name, material names") — without it the
    // material-name search predicate would have nothing to match on.
    const { data: rawReqs, error: reqErr } = await client
      .from("material_requisitions")
      .select(
        `
        id,
        from_location_id,
        to_location_id,
        status,
        assigned_to,
        requester_remark,
        created_at,
        updated_at,
        from_location:locations!material_requisitions_from_location_id_fkey ( name ),
        to_location:locations!material_requisitions_to_location_id_fkey ( name ),
        assignee:profiles!material_requisitions_assigned_to_fkey ( display_name ),
        items:material_requisition_items (
          id,
          requested_qty,
          materials!material_requisition_items_material_id_fkey ( name )
        )
        `,
      )
      .order("created_at", { ascending: false });
    if (reqErr) throw reqErr;

    // ── 2. Active locations (for the create form's pickers)
    const { data: rawLocations, error: locErr } = await client
      .from("locations")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (locErr) throw locErr;

    // ── 3. Active materials with category.is_consumable + base unit
    //       abbreviation (for the create form picker)
    const { data: rawMaterials, error: matErr } = await client
      .from("materials")
      .select(
        `
        id,
        name,
        sku,
        is_active,
        material_categories!materials_category_id_fkey ( is_consumable ),
        units!materials_base_unit_id_fkey ( abbreviation )
        `,
      )
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (matErr) throw matErr;

    // ── 4. Project rows + accumulate counts + KPIs ─────────────────────
    let openCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let oldestPendingSeconds: number | null = null;
    let fulfillmentSecondsSum = 0;
    let fulfillmentCompletedCount = 0;
    let requestedTodayCount = 0;
    const now = Date.now();

    const rows: RequisitionListRow[] = (rawReqs ?? []).map((r) => {
      const fromLoc = r.from_location as { name: string } | null;
      const toLoc = r.to_location as { name: string } | null;
      // PostgREST cannot auto-introspect the assigned_to → profiles FK
      // (Edge typegen limitation), so the field surfaces as a
      // SelectQueryError; cast through unknown per the TS error hint.
      const assignee = r.assignee as unknown as
        | { display_name: string | null }
        | null;
      const items = (r.items ?? []) as Array<{
        id: string;
        requested_qty: number;
        materials: { name: string } | null;
      }>;

      const itemCount = items.length;
      const totalRequestedQty = items.reduce(
        (sum, i) => sum + Number(i.requested_qty ?? 0),
        0,
      );
      const materialNames = items.flatMap((i) =>
        i.materials?.name ? [i.materials.name] : [],
      );
      const status = r.status as InventoryTaskStatus | null;
      const isOpen = status === "pending" || status === "in_progress";
      const isCompleted = status === "completed";

      // Counts per tab bucket. `pending_review` is intentionally NOT
      // surfaced — design dropped the manager-approval step (see types
      // RequisitionStatusFilter doc).
      if (isOpen) openCount += 1;
      else if (isCompleted) completedCount += 1;
      else if (status === "cancelled") cancelledCount += 1;

      // Oldest open
      if (isOpen) {
        const ageSec = Math.floor(
          (now - new Date(r.created_at).getTime()) / 1000,
        );
        if (oldestPendingSeconds === null || ageSec > oldestPendingSeconds) {
          oldestPendingSeconds = ageSec;
        }
      }

      // Fulfillment time (approximation — `updated_at` is the closest
      // proxy when status='completed'; the WF-10 trigger updates the
      // requisition row at fulfillment time so this is accurate within
      // one update of the actual completion).
      const completedAt = isCompleted ? r.updated_at : null;
      if (isCompleted && completedAt) {
        const seconds = Math.max(
          0,
          Math.floor(
            (new Date(completedAt).getTime() -
              new Date(r.created_at).getTime()) /
              1000,
          ),
        );
        fulfillmentSecondsSum += seconds;
        fulfillmentCompletedCount += 1;
      }

      // Requested today (UTC date prefix on created_at)
      if (r.created_at.startsWith(todayIso)) requestedTodayCount += 1;

      return {
        id: r.id,
        fromLocationId: r.from_location_id,
        fromLocationName: fromLoc?.name ?? "Unknown",
        toLocationId: r.to_location_id,
        toLocationName: toLoc?.name ?? null,
        status,
        assignedToName: assignee?.display_name ?? null,
        requesterRemark: r.requester_remark,
        itemCount,
        totalRequestedQty,
        materialNames,
        createdAt: r.created_at,
        completedAt,
      };
    });

    const counts: RequisitionStatusCounts = {
      open: openCount,
      completed: completedCount,
      cancelled: cancelledCount,
    };

    const kpis: RequisitionListKpis = {
      oldestPendingSeconds,
      avgFulfillmentSeconds:
        fulfillmentCompletedCount > 0
          ? Math.floor(fulfillmentSecondsSum / fulfillmentCompletedCount)
          : null,
      requestedTodayCount,
    };

    const materials = (rawMaterials ?? []).map((m) => {
      const cat = m.material_categories as { is_consumable: boolean | null } | null;
      const unit = m.units as { abbreviation: string } | null;
      return {
        id: m.id,
        name: m.name,
        sku: m.sku,
        isConsumable: cat?.is_consumable === true,
        baseUnitAbbreviation: unit?.abbreviation ?? null,
      };
    });

    return {
      rows,
      counts,
      kpis,
      locations: (rawLocations ?? []).map((l) => ({
        id: l.id,
        name: l.name,
      })),
      materials,
    };
  },
);
