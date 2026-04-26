import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { RESTOCK_RECENT_LIMIT } from "@/features/inventory/constants";
import type {
  LocationOption,
  MaterialOption,
  RestockContext,
  RequisitionItemView,
  RequisitionRow,
} from "@/features/inventory/types";

/**
 * Loads everything the crew restock form needs in a single RSC call.
 *
 * Auto-detection logic: look up the caller's staff_record → org_unit_id,
 * then find the first active location sharing that org_unit_id. This is the
 * "from" location pre-fill. Falls back to null when no match exists.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * RLS-scoped; incompatible with `unstable_cache` (would require service-role
 * client that bypasses RLS per §2 Zero-Trust RLS).
 */
export const getRestockContext = cache(
  async (
    client: SupabaseClient<Database>,
    userId: string,
  ): Promise<RestockContext> => {
    // Resolve auto-location via staff_record org_unit_id
    const { data: staffRecord } = await client
      .from("staff_records")
      .select("id, org_unit_id")
      .eq("id", userId)
      .maybeSingle();

    let autoLocationId: string | null = null;
    if (staffRecord?.org_unit_id) {
      const { data: locationMatch } = await client
        .from("locations")
        .select("id")
        .eq("org_unit_id", staffRecord.org_unit_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      autoLocationId = locationMatch?.id ?? null;
    }

    // Load materials with category for movement_type_code resolution
    const { data: materialsRaw, error: matError } = await client
      .from("materials")
      .select(
        "id, name, sku, category_id, material_categories!inner(is_consumable)",
      )
      .eq("is_active", true)
      .order("name");
    if (matError) throw matError;

    const materials: ReadonlyArray<MaterialOption> = (materialsRaw ?? []).map(
      (m) => {
        const cat = m.material_categories as { is_consumable: boolean | null };
        return {
          id: m.id,
          name: m.name,
          sku: m.sku,
          categoryId: m.category_id,
          isConsumable: cat?.is_consumable ?? null,
        };
      },
    );

    // Load active locations
    const { data: locationsRaw, error: locError } = await client
      .from("locations")
      .select("id, name, org_unit_id")
      .eq("is_active", true)
      .order("name");
    if (locError) throw locError;

    const locations: ReadonlyArray<LocationOption> = (locationsRaw ?? []).map(
      (l) => ({
        id: l.id,
        name: l.name,
        orgUnitId: l.org_unit_id,
      }),
    );

    // Own recent requisitions (LIMIT 10), joined with locations and items+materials
    const { data: reqRaw, error: reqError } = await client
      .from("material_requisitions")
      .select(
        `id,
         from_location_id,
         to_location_id,
         status,
         assigned_to,
         requester_remark,
         created_at,
         from_location:locations!material_requisitions_from_location_id_fkey(id, name),
         to_location:locations!material_requisitions_to_location_id_fkey(id, name),
         material_requisition_items(id, material_id, movement_type_code, requested_qty, delivered_qty, materials(name))`,
      )
      .eq("created_by", userId)
      .order("created_at", { ascending: false })
      .limit(RESTOCK_RECENT_LIMIT);
    if (reqError) throw reqError;

    const ownRecentRequisitions: ReadonlyArray<RequisitionRow> = (
      reqRaw ?? []
    ).map((r) => {
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
    });

    return {
      materials,
      locations,
      ownRecentRequisitions,
      autoLocationId,
    };
  },
);
