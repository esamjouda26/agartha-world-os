import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { BomListData, BomRow, BomListKpis } from "@/features/pos/types/management";

/**
 * RSC query — all data for /management/pos/bom (BOM list).
 *
 * Schema refs:
 *   init_schema.sql:2225 — bill_of_materials
 *   init_schema.sql:2129 — materials
 *   init_schema.sql:2244 — idx_bom_one_active_default (partial unique)
 *
 * KPIs:
 *   - activeBoms: count where status='active'
 *   - draftBoms: count where status='draft'
 *   - finishedWithoutBom: materials with type IN ('finished','semi_finished')
 *     that have no active+default BOM.
 *
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getBoms = cache(
  async (client: SupabaseClient<Database>): Promise<BomListData> => {
    const [bomsResult, materialsResult] = await Promise.all([
      client
        .from("bill_of_materials")
        .select(
          "id, parent_material_id, version, effective_from, effective_to, status, is_default, created_at, materials!bill_of_materials_parent_material_id_fkey(name, material_type)",
        )
        .order("parent_material_id", { ascending: true })
        .order("version", { ascending: false }),

      // Materials usable as BOM parents (finished + semi_finished produce recipes)
      client
        .from("materials")
        .select("id, name, material_type")
        .eq("is_active", true)
        .in("material_type", ["finished", "semi_finished"])
        .order("name", { ascending: true }),
    ]);

    if (bomsResult.error) throw bomsResult.error;
    if (materialsResult.error) throw materialsResult.error;

    const rows: BomRow[] = (bomsResult.data ?? []).map((b) => {
      const mat = b.materials as { name: string; material_type: string } | null;
      return {
        id: b.id,
        parentMaterialId: b.parent_material_id,
        parentMaterialName: mat?.name ?? "Unknown",
        parentMaterialType: mat?.material_type ?? "raw",
        version: b.version ?? 1,
        effectiveFrom: b.effective_from ?? null,
        effectiveTo: b.effective_to ?? null,
        status: b.status,
        isDefault: b.is_default ?? false,
        createdAt: b.created_at,
      };
    });

    // ── KPIs ───────────────────────────────────────────────────────────
    let activeBoms = 0;
    let draftBoms = 0;
    const materialsWithDefaultActive = new Set<string>();
    for (const r of rows) {
      if (r.status === "active") activeBoms++;
      if (r.status === "draft") draftBoms++;
      if (r.status === "active" && r.isDefault) {
        materialsWithDefaultActive.add(r.parentMaterialId);
      }
    }

    const finishedMaterials = materialsResult.data ?? [];
    const finishedWithoutBom = finishedMaterials.filter(
      (m) => !materialsWithDefaultActive.has(m.id),
    ).length;

    const kpis: BomListKpis = { activeBoms, draftBoms, finishedWithoutBom };

    return {
      rows,
      kpis,
      materials: finishedMaterials.map((m) => ({
        id: m.id,
        name: m.name,
        materialType: m.material_type,
      })),
    };
  },
);
