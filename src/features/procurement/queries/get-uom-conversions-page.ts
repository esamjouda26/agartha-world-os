import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  UomConversionListRow,
  UomConversionsPageData,
} from "@/features/procurement/types";

/**
 * RSC query — payload for the standalone UOM Conversions surface:
 *   • `/management/uom`  (procurement | pos | system gating)
 *   • `/admin/it/uom`    (system gating — IT-admin twin)
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup. RLS on
 * `uom_conversions` allows reads for any authenticated user; writes are
 * gated by `system:c|u|d` OR `procurement:c|u|d` (init_schema.sql §7c).
 */
export const getUomConversionsPage = cache(
  async (
    client: SupabaseClient<Database>,
  ): Promise<UomConversionsPageData> => {
    // ── 1. Conversions joined with optional material name + unit names. ─
    const { data: rawConv, error: convErr } = await client
      .from("uom_conversions")
      .select(
        `
        id,
        material_id,
        from_unit_id,
        to_unit_id,
        factor,
        materials!uom_conversions_material_id_fkey ( name ),
        from_unit:units!uom_conversions_from_unit_id_fkey ( name, abbreviation ),
        to_unit:units!uom_conversions_to_unit_id_fkey ( name, abbreviation )
        `,
      )
      .order("material_id", { ascending: true, nullsFirst: true });
    if (convErr) throw convErr;

    // ── 2. Slim materials list (active only) for the form picker. ──────
    const { data: rawMaterials, error: matErr } = await client
      .from("materials")
      .select("id, name, sku, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (matErr) throw matErr;

    // ── 3. Units catalog. ──────────────────────────────────────────────
    const { data: rawUnits, error: unitErr } = await client
      .from("units")
      .select("id, name, abbreviation")
      .order("name", { ascending: true });
    if (unitErr) throw unitErr;

    const conversions: UomConversionListRow[] = (rawConv ?? []).map((c) => {
      const mat = c.materials as { name: string } | null;
      const fromU = c.from_unit as { name: string; abbreviation: string } | null;
      const toU = c.to_unit as { name: string; abbreviation: string } | null;
      return {
        id: c.id,
        materialId: c.material_id,
        materialName: mat?.name ?? null,
        fromUnitId: c.from_unit_id,
        fromUnitName: fromU?.name ?? "Unknown",
        fromUnitAbbreviation: fromU?.abbreviation ?? "?",
        toUnitId: c.to_unit_id,
        toUnitName: toU?.name ?? "Unknown",
        toUnitAbbreviation: toU?.abbreviation ?? "?",
        factor: Number(c.factor ?? 0),
        isGlobal: c.material_id === null,
      };
    });

    return {
      conversions,
      materials: (rawMaterials ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        sku: m.sku,
      })),
      units: (rawUnits ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        abbreviation: u.abbreviation,
      })),
    };
  },
);
