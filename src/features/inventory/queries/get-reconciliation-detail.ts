import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  AssigneeOption,
  InventoryTaskStatus,
  ReconciliationDetailData,
  ReconciliationDetailItem,
} from "@/features/inventory/types";

/**
 * RSC query — payload for `/management/inventory/reconciliation/[id]`.
 *
 * Returns `null` when missing / RLS-filtered. The page calls notFound()
 * on null per the CLAUDE.md §1 detail-route contract.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup.
 *
 * Tables: `inventory_reconciliations`, `inventory_reconciliation_items`,
 * `materials` (per spec frontend_spec.md:2174).
 *
 * Variance + hasVariance are computed server-side so the client doesn't
 * repeat the math and the "Approve Adjustments" vs "Confirm Count"
 * button label is decided in one authoritative pass.
 */
export const getReconciliationDetail = cache(
  async (
    client: SupabaseClient<Database>,
    reconciliationId: string,
  ): Promise<ReconciliationDetailData | null> => {
    // ── 1. Header row + location + assignee ────────────────────────────
    const { data: recon, error: reconErr } = await client
      .from("inventory_reconciliations")
      .select(
        `
        id,
        location_id,
        scheduled_date,
        scheduled_time,
        status,
        assigned_to,
        manager_remark,
        crew_remark,
        discrepancy_found,
        created_at,
        updated_at,
        location:locations!inventory_reconciliations_location_id_fkey ( name ),
        assignee:profiles!inventory_reconciliations_assigned_to_fkey ( display_name )
        `,
      )
      .eq("id", reconciliationId)
      .maybeSingle();
    if (reconErr) throw reconErr;
    if (!recon) return null;

    // ── 2. Items + material name + base unit ───────────────────────────
    const { data: rawItems, error: itemsErr } = await client
      .from("inventory_reconciliation_items")
      .select(
        `
        id,
        material_id,
        system_qty,
        physical_qty,
        photo_url,
        materials!inventory_reconciliation_items_material_id_fkey (
          name,
          units!materials_base_unit_id_fkey ( abbreviation )
        )
        `,
      )
      .eq("reconciliation_id", reconciliationId)
      .order("created_at", { ascending: true });
    if (itemsErr) throw itemsErr;

    // ── 3. Active staff for recount-with-reassign picker ───────────────
    const { data: rawStaff, error: staffErr } = await client
      .from("profiles")
      .select("id, display_name, employment_status")
      .eq("employment_status", "active")
      .not("display_name", "is", null)
      .order("display_name", { ascending: true });
    if (staffErr) throw staffErr;

    // ── 4. Project ─────────────────────────────────────────────────────
    const loc = recon.location as { name: string } | null;
    // PostgREST cannot auto-introspect assigned_to → profiles; cast through
    // unknown per the TS error hint.
    const assignee = recon.assignee as unknown as
      | { display_name: string | null }
      | null;

    let totalAbsVariance = 0;
    let hasVariance = false;
    const items: ReconciliationDetailItem[] = (rawItems ?? []).map((i) => {
      const mat = i.materials as
        | { name: string; units: { abbreviation: string } | null }
        | null;
      const systemQty = Number(i.system_qty ?? 0);
      const physicalQty = Number(i.physical_qty ?? 0);
      const variance = physicalQty - systemQty;
      if (variance !== 0) hasVariance = true;
      totalAbsVariance += Math.abs(variance);
      return {
        id: i.id,
        materialId: i.material_id,
        materialName: mat?.name ?? "Unknown material",
        baseUnitAbbreviation: mat?.units?.abbreviation ?? null,
        systemQty,
        physicalQty,
        variance,
        photoUrl: i.photo_url,
      };
    });

    const assignees: AssigneeOption[] = (rawStaff ?? []).flatMap((p) =>
      p.display_name
        ? [{ userId: p.id, displayName: p.display_name }]
        : [],
    );

    return {
      id: recon.id,
      locationId: recon.location_id,
      locationName: loc?.name ?? "Unknown",
      scheduledDate: recon.scheduled_date,
      scheduledTime: recon.scheduled_time,
      status: recon.status as InventoryTaskStatus | null,
      assignedToId: recon.assigned_to,
      assignedToName: assignee?.display_name ?? null,
      managerRemark: recon.manager_remark,
      crewRemark: recon.crew_remark,
      discrepancyFound: recon.discrepancy_found ?? false,
      createdAt: recon.created_at,
      updatedAt: recon.updated_at,
      items,
      hasVariance,
      totalAbsVariance,
      assignees,
    };
  },
);
