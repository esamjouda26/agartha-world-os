import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { ModifierGroupRow, ModifierOptionRow, ModifierAssignmentRow, ModifierPageData } from "@/features/pos/types/management";

/**
 * RSC query — all data for /management/pos/[id]/modifiers.
 *
 * Schema refs:
 *   init_schema.sql:3049 — pos_modifier_groups (global, no pos_point_id)
 *   init_schema.sql:3063 — pos_modifier_options
 *   init_schema.sql:3080 — material_modifier_groups
 *   init_schema.sql:1079 — pos_points
 *   init_schema.sql:2168 — material_sales_data (catalog for this pos_point)
 *
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getModifierPage = cache(
  async (
    client: SupabaseClient<Database>,
    posPointId: string,
  ): Promise<ModifierPageData | null> => {
    const [posPointResult, groupsResult, catalogResult, allMaterialsResult] = await Promise.all([
      client
        .from("pos_points")
        .select("id, name, display_name")
        .eq("id", posPointId)
        .maybeSingle(),

      // All modifier groups (global) + their options + linked materials
      client
        .from("pos_modifier_groups")
        .select(
          "id, name, display_name, min_selections, max_selections, sort_order, is_active, pos_modifier_options(id, group_id, name, price_delta, material_id, quantity_delta, sort_order, is_active, materials!pos_modifier_options_material_id_fkey(name))",
        )
        .order("sort_order", { ascending: true }),

      // Catalog materials for this pos_point (for the assignment section)
      client
        .from("material_sales_data")
        .select("material_id, display_name, materials!material_sales_data_material_id_fkey(name)")
        .eq("pos_point_id", posPointId)
        .order("sort_order", { ascending: true }),

      // All materials (for modifier option's materialId dropdown)
      client
        .from("materials")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (posPointResult.error) throw posPointResult.error;
    if (!posPointResult.data) return null;
    if (groupsResult.error) throw groupsResult.error;
    if (catalogResult.error) throw catalogResult.error;
    if (allMaterialsResult.error) throw allMaterialsResult.error;

    // Fetch assignments for the catalog material IDs
    const catalogMaterialIds = (catalogResult.data ?? []).map((r) => r.material_id);
    const assignments: ModifierAssignmentRow[] = [];

    if (catalogMaterialIds.length > 0) {
      const { data: assignData, error: assignErr } = await client
        .from("material_modifier_groups")
        .select("material_id, modifier_group_id, sort_order, materials!material_modifier_groups_material_id_fkey(name)")
        .in("material_id", catalogMaterialIds);
      if (assignErr) throw assignErr;

      for (const a of assignData ?? []) {
        const mat = a.materials as { name: string } | null;
        assignments.push({
          materialId: a.material_id,
          materialName: mat?.name ?? "Unknown",
          modifierGroupId: a.modifier_group_id,
          sortOrder: a.sort_order ?? 0,
        });
      }
    }

    const pp = posPointResult.data;

    const groups: ModifierGroupRow[] = (groupsResult.data ?? []).map((g) => {
      const options: ModifierOptionRow[] = (g.pos_modifier_options ?? []).map((o) => {
        const mat = o.materials as { name: string } | null;
        return {
          id: o.id,
          groupId: o.group_id,
          name: o.name,
          priceDelta: Math.round(Number(o.price_delta) * 100),
          materialId: o.material_id ?? null,
          materialName: mat?.name ?? null,
          quantityDelta: Number(o.quantity_delta),
          sortOrder: o.sort_order ?? 0,
          isActive: o.is_active ?? true,
        };
      }).sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        id: g.id,
        name: g.name,
        displayName: g.display_name,
        minSelections: g.min_selections ?? 0,
        maxSelections: g.max_selections ?? 1,
        sortOrder: g.sort_order ?? 0,
        isActive: g.is_active ?? true,
        options,
      };
    });

    const catalogMaterials = (catalogResult.data ?? []).map((r) => {
      const mat = r.materials as { name: string } | null;
      return { id: r.material_id, name: r.display_name ?? mat?.name ?? "Unknown" };
    });

    return {
      posPoint: { id: pp.id, name: pp.name, displayName: pp.display_name },
      groups,
      assignments,
      materials: catalogMaterials,
    };
  },
);
