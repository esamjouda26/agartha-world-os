import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { OrgUnitRow, OrgUnitNode, UnitType } from "@/features/org-units/types/org-unit";

/**
 * RSC query — all org_units ordered by ltree path + staff count per node.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getOrgUnits = cache(
  async (client: SupabaseClient<Database>): Promise<OrgUnitRow[]> => {
    const [orgResult, staffCountResult] = await Promise.all([
      client
        .from("org_units")
        .select("id, parent_id, unit_type, code, name, path, is_active")
        .order("path", { ascending: true }),
      client
        .from("staff_records")
        .select("org_unit_id", { count: "exact" })
        .not("org_unit_id", "is", null),
    ]);

    if (orgResult.error) throw orgResult.error;
    if (staffCountResult.error) throw staffCountResult.error;

    // Count staff per org_unit
    const staffCountMap = new Map<string, number>();
    for (const row of staffCountResult.data ?? []) {
      if (row.org_unit_id) {
        staffCountMap.set(row.org_unit_id, (staffCountMap.get(row.org_unit_id) ?? 0) + 1);
      }
    }

    return (orgResult.data ?? []).map((ou) => ({
      id: ou.id,
      parentId: ou.parent_id ?? null,
      unitType: (ou.unit_type ?? "department") as UnitType,
      code: ou.code,
      name: ou.name,
      path: String(ou.path ?? ou.code),
      isActive: ou.is_active ?? true,
      staffCount: staffCountMap.get(ou.id) ?? 0,
    }));
  },
);

/**
 * Build a nested tree from a flat, path-sorted list of org units.
 * Since the list is sorted by ltree path, parents always precede children.
 */
export function buildOrgUnitTree(rows: readonly OrgUnitRow[]): OrgUnitNode[] {
  const nodeMap = new Map<string, OrgUnitNode>();
  const roots: OrgUnitNode[] = [];

  for (const row of rows) {
    nodeMap.set(row.id, { ...row, children: [] });
  }

  for (const row of rows) {
    const node = nodeMap.get(row.id)!;
    if (row.parentId && nodeMap.has(row.parentId)) {
      nodeMap.get(row.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
