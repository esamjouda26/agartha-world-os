import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  BomDetailData,
  BomRow,
  BomComponentRow,
} from "@/features/pos/types/management";

/**
 * RSC query — all data for /management/pos/bom/[id].
 *
 * Schema refs:
 *   init_schema.sql:2225 — bill_of_materials
 *   init_schema.sql:2248 — bom_components
 *   init_schema.sql:2129 — materials
 *
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getBomDetail = cache(
  async (
    client: SupabaseClient<Database>,
    bomId: string,
  ): Promise<BomDetailData | null> => {
    const [bomResult, componentsResult, materialsResult] = await Promise.all([
      client
        .from("bill_of_materials")
        .select(
          "id, parent_material_id, version, effective_from, effective_to, status, is_default, created_at, materials!bill_of_materials_parent_material_id_fkey(name, material_type)",
        )
        .eq("id", bomId)
        .maybeSingle(),

      client
        .from("bom_components")
        .select(
          "id, bom_id, component_material_id, quantity, scrap_pct, is_phantom, sort_order, materials!bom_components_component_material_id_fkey(name)",
        )
        .eq("bom_id", bomId)
        .order("sort_order", { ascending: true }),

      client
        .from("materials")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (bomResult.error) throw bomResult.error;
    if (!bomResult.data) return null;
    if (componentsResult.error) throw componentsResult.error;
    if (materialsResult.error) throw materialsResult.error;

    const b = bomResult.data;
    const parentMat = b.materials as { name: string; material_type: string } | null;

    const bom: BomRow = {
      id: b.id,
      parentMaterialId: b.parent_material_id,
      parentMaterialName: parentMat?.name ?? "Unknown",
      parentMaterialType: parentMat?.material_type ?? "raw",
      version: b.version ?? 1,
      effectiveFrom: b.effective_from ?? null,
      effectiveTo: b.effective_to ?? null,
      status: b.status,
      isDefault: b.is_default ?? false,
      createdAt: b.created_at,
    };

    const components: BomComponentRow[] = (componentsResult.data ?? []).map((c) => {
      const mat = c.materials as { name: string } | null;
      return {
        id: c.id,
        bomId: c.bom_id,
        componentMaterialId: c.component_material_id,
        componentMaterialName: mat?.name ?? "Unknown",
        quantity: Number(c.quantity),
        scrapPct: Number(c.scrap_pct ?? 0),
        isPhantom: c.is_phantom ?? false,
        sortOrder: c.sort_order ?? 0,
      };
    });

    // Filter parent material out of materials dropdown to prevent obvious self-ref
    // (the DB trigger trg_bom_component_self_ref_check is the real guard).
    const materials = (materialsResult.data ?? [])
      .filter((m) => m.id !== b.parent_material_id)
      .map((m) => ({ id: m.id, name: m.name }));

    return { bom, components, materials };
  },
);
