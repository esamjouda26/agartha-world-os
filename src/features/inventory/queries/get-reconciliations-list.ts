import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  AssigneeOption,
  InventoryTaskStatus,
  ReconciliationListData,
  ReconciliationListKpis,
  ReconciliationListRow,
  ReconciliationStatusCounts,
} from "@/features/inventory/types";

/**
 * RSC query — payload for `/management/inventory/reconciliation`.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup. RLS
 * Tier 3b (`inventory_ops`) gates SELECT.
 *
 * Single SELECT pulls reconciliations + locations + assignee profiles +
 * an embedded count of items; KPIs and tab counts are computed in one
 * JS pass to avoid a second round-trip.
 */
export const getReconciliationsList = cache(
  async (
    client: SupabaseClient<Database>,
  ): Promise<ReconciliationListData> => {
    // ── 1. Reconciliations + location name + assignee + items count ──
    const { data: rawRecons, error: reconErr } = await client
      .from("inventory_reconciliations")
      .select(
        `
        id,
        location_id,
        scheduled_date,
        scheduled_time,
        status,
        assigned_to,
        discrepancy_found,
        created_at,
        location:locations!inventory_reconciliations_location_id_fkey ( name ),
        assignee:profiles!inventory_reconciliations_assigned_to_fkey ( display_name ),
        items:inventory_reconciliation_items ( id )
        `,
      )
      .order("created_at", { ascending: false });
    if (reconErr) throw reconErr;

    // ── 2. Active locations (form picker) ────────────────────────────
    const { data: rawLocations, error: locErr } = await client
      .from("locations")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (locErr) throw locErr;

    // ── 3. Active staff for the assignee picker ──────────────────────
    const { data: rawStaff, error: staffErr } = await client
      .from("profiles")
      .select("id, display_name, employment_status")
      .eq("employment_status", "active")
      .not("display_name", "is", null)
      .order("display_name", { ascending: true });
    if (staffErr) throw staffErr;

    // ── 4. Active materials (form picker) ────────────────────────────
    const { data: rawMaterials, error: matErr } = await client
      .from("materials")
      .select(
        `
        id,
        name,
        sku,
        is_active,
        units!materials_base_unit_id_fkey ( abbreviation )
        `,
      )
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (matErr) throw matErr;

    // ── 5. Stock balance cache for the form's "system_qty preview" ───
    const { data: rawStock, error: stockErr } = await client
      .from("stock_balance_cache")
      .select("material_id, location_id, current_qty");
    if (stockErr) throw stockErr;

    // ── 6. Project rows + accumulate counts + KPIs ───────────────────
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthStartIso = monthStart.toISOString();

    let activeCount = 0;
    let pendingReviewCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let pendingReviewKpi = 0;
    let discrepanciesThisMonth = 0;
    let completedThisMonth = 0;

    const rows: ReconciliationListRow[] = (rawRecons ?? []).map((r) => {
      const loc = r.location as { name: string } | null;
      // PostgREST cannot auto-introspect the assigned_to → profiles FK
      // (Edge typegen limitation); cast through unknown per the TS hint.
      const assignee = r.assignee as unknown as
        | { display_name: string | null }
        | null;
      const items = (r.items ?? []) as Array<{ id: string }>;
      const status = r.status as InventoryTaskStatus | null;

      const isActive =
        status === "pending" || status === "in_progress";
      const isPendingReview = status === "pending_review";
      const isCompleted = status === "completed";
      const isCancelled = status === "cancelled";

      if (isActive) activeCount += 1;
      else if (isPendingReview) pendingReviewCount += 1;
      else if (isCompleted) completedCount += 1;
      else if (isCancelled) cancelledCount += 1;

      // KPIs
      if (isPendingReview) pendingReviewKpi += 1;
      if (isCompleted && r.created_at >= monthStartIso) {
        completedThisMonth += 1;
        if (r.discrepancy_found === true) discrepanciesThisMonth += 1;
      }

      return {
        id: r.id,
        locationId: r.location_id,
        locationName: loc?.name ?? "Unknown",
        scheduledDate: r.scheduled_date,
        scheduledTime: r.scheduled_time,
        status,
        assignedToName: assignee?.display_name ?? null,
        itemCount: items.length,
        discrepancyFound: r.discrepancy_found ?? false,
        createdAt: r.created_at,
      };
    });

    const counts: ReconciliationStatusCounts = {
      active: activeCount,
      pendingReview: pendingReviewCount,
      completed: completedCount,
      cancelled: cancelledCount,
    };

    const kpis: ReconciliationListKpis = {
      pendingReviewCount: pendingReviewKpi,
      discrepanciesThisMonthCount: discrepanciesThisMonth,
      completedThisMonthCount: completedThisMonth,
    };

    const assignees: AssigneeOption[] = (rawStaff ?? []).flatMap((p) =>
      p.display_name
        ? [{ userId: p.id, displayName: p.display_name }]
        : [],
    );

    const materials = (rawMaterials ?? []).map((m) => {
      const unit = m.units as { abbreviation: string } | null;
      return {
        id: m.id,
        name: m.name,
        sku: m.sku,
        baseUnitAbbreviation: unit?.abbreviation ?? null,
      };
    });

    const stockByMaterialLocation: Record<string, number> = {};
    for (const sb of rawStock ?? []) {
      stockByMaterialLocation[`${sb.material_id}:${sb.location_id}`] = Number(
        sb.current_qty ?? 0,
      );
    }

    return {
      rows,
      counts,
      kpis,
      locations: (rawLocations ?? []).map((l) => ({
        id: l.id,
        name: l.name,
      })),
      assignees,
      materials,
      stockByMaterialLocation,
    };
  },
);
