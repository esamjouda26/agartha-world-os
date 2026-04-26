import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  MovementDirection,
  MovementTypeRow,
  MovementTypesCatalogData,
} from "@/features/inventory/types";

/**
 * RSC query — payload for the Movement Types tab of
 * `/management/inventory/movements`. Reference catalog (~15 rows in
 * the seeded baseline; init_schema.sql:2615-2631), no pagination.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup. RLS
 * on `movement_types` allows SELECT to any authenticated user
 * (init_schema.sql:2644-2645); writes gated by `inventory:c|u|d`.
 */
export const getMovementTypesList = cache(
  async (
    client: SupabaseClient<Database>,
  ): Promise<MovementTypesCatalogData> => {
    const { data, error } = await client
      .from("movement_types")
      .select(
        "id, code, name, description, direction, requires_source_doc, requires_cost_center, is_active",
      )
      .order("code", { ascending: true });
    if (error) throw error;

    const rows: MovementTypeRow[] = (data ?? []).map((mt) => ({
      id: mt.id,
      code: mt.code,
      name: mt.name,
      description: mt.description,
      direction: mt.direction as MovementDirection,
      requiresSourceDoc: mt.requires_source_doc ?? false,
      requiresCostCenter: mt.requires_cost_center ?? false,
      isActive: mt.is_active ?? true,
    }));

    return { rows };
  },
);
