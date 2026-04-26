import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  AssigneeOption,
  InventoryTaskStatus,
  RequisitionDetailData,
  RequisitionDetailItem,
} from "@/features/inventory/types";

/**
 * RSC query — payload for `/management/inventory/requisitions/[id]`.
 *
 * Returns `null` when the requisition is missing or RLS-filtered. The
 * page wraps the call and renders `not-found.tsx` on null.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup.
 *
 * Tables: `material_requisitions`, `material_requisition_items`,
 * `materials`, `movement_types` (per spec frontend_spec.md:2100).
 */
export const getRequisitionDetail = cache(
  async (
    client: SupabaseClient<Database>,
    requisitionId: string,
  ): Promise<RequisitionDetailData | null> => {
    // ── 1. Header row + locations + assignee profile ───────────────────
    const { data: req, error: reqErr } = await client
      .from("material_requisitions")
      .select(
        `
        id,
        from_location_id,
        to_location_id,
        status,
        assigned_to,
        requester_remark,
        runner_remark,
        created_at,
        updated_at,
        from_location:locations!material_requisitions_from_location_id_fkey ( name ),
        to_location:locations!material_requisitions_to_location_id_fkey ( name ),
        assignee:profiles!material_requisitions_assigned_to_fkey ( display_name )
        `,
      )
      .eq("id", requisitionId)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!req) return null;

    // ── 2. Line items + material name + base unit ──────────────────────
    const { data: rawItems, error: itemsErr } = await client
      .from("material_requisition_items")
      .select(
        `
        id,
        material_id,
        movement_type_code,
        requested_qty,
        delivered_qty,
        materials!material_requisition_items_material_id_fkey (
          name,
          units!materials_base_unit_id_fkey ( abbreviation )
        )
        `,
      )
      .eq("requisition_id", requisitionId)
      .order("created_at", { ascending: true });
    if (itemsErr) throw itemsErr;

    // ── 3. Movement type metadata for codes referenced by line items ──
    const codes = Array.from(
      new Set((rawItems ?? []).map((i) => i.movement_type_code)),
    );
    const movementTypeMap = new Map<
      string,
      { name: string; direction: string }
    >();
    if (codes.length > 0) {
      const { data: rawMt, error: mtErr } = await client
        .from("movement_types")
        .select("code, name, direction")
        .in("code", codes);
      if (mtErr) throw mtErr;
      for (const mt of rawMt ?? []) {
        movementTypeMap.set(mt.code, {
          name: mt.name,
          direction: mt.direction,
        });
      }
    }

    // ── 4. Active-staff list for reassign picker ───────────────────────
    //
    // The assigned_to FK references auth.users; profiles carries the
    // display_name. We surface every active profile as a potential
    // assignee. Filtering to "runner-only" is not enforceable from a
    // single query (role assignment lives in a junction table) — the
    // manager picks from the full active list and RLS on
    // material_requisitions UPDATE still gates the actual change.
    const { data: rawAssignees, error: assigneesErr } = await client
      .from("profiles")
      .select("id, display_name, employment_status")
      .eq("employment_status", "active")
      .not("display_name", "is", null)
      .order("display_name", { ascending: true });
    if (assigneesErr) throw assigneesErr;

    // ── 5. Project ─────────────────────────────────────────────────────
    const fromLoc = req.from_location as { name: string } | null;
    const toLoc = req.to_location as { name: string } | null;
    // PostgREST cannot auto-introspect the assigned_to → profiles FK
    // (Edge typegen limitation); cast through unknown per the TS hint.
    const assignee = req.assignee as unknown as
      | { display_name: string | null }
      | null;

    const items: RequisitionDetailItem[] = (rawItems ?? []).map((i) => {
      const mat = i.materials as
        | { name: string; units: { abbreviation: string } | null }
        | null;
      const mt = movementTypeMap.get(i.movement_type_code);
      return {
        id: i.id,
        materialId: i.material_id,
        materialName: mat?.name ?? "Unknown material",
        baseUnitAbbreviation: mat?.units?.abbreviation ?? null,
        movementTypeCode: i.movement_type_code,
        movementTypeName: mt?.name ?? i.movement_type_code,
        movementTypeDirection: mt?.direction ?? "neutral",
        requestedQty: Number(i.requested_qty ?? 0),
        deliveredQty: i.delivered_qty === null ? null : Number(i.delivered_qty),
      };
    });

    const assignees: AssigneeOption[] = (rawAssignees ?? []).flatMap((p) =>
      p.display_name
        ? [{ userId: p.id, displayName: p.display_name }]
        : [],
    );

    return {
      id: req.id,
      fromLocationId: req.from_location_id,
      fromLocationName: fromLoc?.name ?? "Unknown",
      toLocationId: req.to_location_id,
      toLocationName: toLoc?.name ?? null,
      status: req.status as InventoryTaskStatus | null,
      assignedToId: req.assigned_to,
      assignedToName: assignee?.display_name ?? null,
      requesterRemark: req.requester_remark,
      runnerRemark: req.runner_remark,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
      items,
      assignees,
    };
  },
);
