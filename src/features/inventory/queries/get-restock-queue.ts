import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  RequisitionItemView,
  RequisitionRow,
  RestockQueue,
} from "@/features/inventory/types";

/**
 * Loads the restock queue for the logistics queue page.
 *
 * Returns two buckets:
 *   - `pending` — all requisitions with status='pending', ordered oldest-first
 *     so the crew works FIFO.
 *   - `inProgress` — only requisitions assigned to the calling user with
 *     status='in_progress', ordered by creation time.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getRestockQueue = cache(
  async (
    client: SupabaseClient<Database>,
    userId: string,
  ): Promise<RestockQueue> => {
    const selectFragment = `
      id,
      from_location_id,
      to_location_id,
      status,
      assigned_to,
      requester_remark,
      created_at,
      from_location:locations!material_requisitions_from_location_id_fkey(id, name),
      to_location:locations!material_requisitions_to_location_id_fkey(id, name),
      material_requisition_items(id, material_id, movement_type_code, requested_qty, delivered_qty, materials(name))
    `;

    const mapRow = (r: {
      id: string;
      from_location_id: string;
      to_location_id: string | null;
      status: Database["public"]["Enums"]["inventory_task_status"] | null;
      assigned_to: string | null;
      requester_remark: string | null;
      created_at: string;
      from_location: unknown;
      to_location: unknown;
      material_requisition_items: Array<{
        id: string;
        material_id: string;
        movement_type_code: string;
        requested_qty: number;
        delivered_qty: number | null;
        materials: unknown;
      }>;
    }): RequisitionRow => {
      const fromLoc = r.from_location as { id: string; name: string } | null;
      const toLoc = r.to_location as { id: string; name: string } | null;
      const rawItems = r.material_requisition_items ?? [];

      const items: ReadonlyArray<RequisitionItemView> = rawItems.map((item) => {
        const mat = item.materials as { name: string } | null;
        return {
          id: item.id,
          materialId: item.material_id,
          materialName: mat?.name ?? "",
          movementTypeCode: item.movement_type_code,
          requestedQty: item.requested_qty,
          deliveredQty: item.delivered_qty,
        };
      });

      return {
        id: r.id,
        fromLocationId: r.from_location_id,
        fromLocationName: fromLoc?.name ?? "",
        toLocationId: r.to_location_id,
        toLocationName: toLoc?.name ?? null,
        status: r.status,
        assignedTo: r.assigned_to,
        requesterRemark: r.requester_remark,
        createdAt: r.created_at,
        items,
      };
    };

    const { data: pendingRaw, error: pendingError } = await client
      .from("material_requisitions")
      .select(selectFragment)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (pendingError) throw pendingError;

    const { data: inProgressRaw, error: inProgressError } = await client
      .from("material_requisitions")
      .select(selectFragment)
      .eq("status", "in_progress")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: true });
    if (inProgressError) throw inProgressError;

    return {
      pending: (pendingRaw ?? []).map(mapRow),
      inProgress: (inProgressRaw ?? []).map(mapRow),
    };
  },
);
