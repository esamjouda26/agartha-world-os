import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  AssigneeOption,
  EquipmentListData,
  EquipmentListKpis,
  EquipmentListRow,
} from "@/features/inventory/types";

/**
 * RSC query — payload for `/management/inventory/equipment`.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup. RLS
 * Tier 3b (`inventory_ops:r`) gates SELECT.
 *
 * The query pulls every assignment (issued + history) and projects
 * counts/KPIs in a single JS pass. `equipment_assignments` is small
 * enough (one row per asset issuance) that pulling everything is cheap;
 * if it ever scales, we can add cursor pagination similar to write-offs.
 */
export const getEquipmentList = cache(
  async (client: SupabaseClient<Database>): Promise<EquipmentListData> => {
    // ── 1. Assignments + material name + base unit + assignee ──────────
    const { data: rawRows, error: rowsErr } = await client
      .from("equipment_assignments")
      .select(
        `
        id,
        material_id,
        assigned_to,
        assigned_at,
        returned_at,
        condition_on_return,
        notes,
        materials!equipment_assignments_material_id_fkey (
          name,
          units!materials_base_unit_id_fkey ( abbreviation )
        ),
        assignee:profiles!equipment_assignments_assigned_to_fkey ( display_name )
        `,
      )
      .order("assigned_at", { ascending: false });
    if (rowsErr) throw rowsErr;

    // ── 2. Returnable materials for the issue form ─────────────────────
    const { data: rawMaterials, error: matErr } = await client
      .from("materials")
      .select(
        `
        id,
        name,
        sku,
        is_active,
        is_returnable,
        units!materials_base_unit_id_fkey ( abbreviation )
        `,
      )
      .eq("is_active", true)
      .eq("is_returnable", true)
      .order("name", { ascending: true });
    if (matErr) throw matErr;

    // ── 3. Active staff for the assignee picker ────────────────────────
    const { data: rawStaff, error: staffErr } = await client
      .from("profiles")
      .select("id, display_name, employment_status")
      .eq("employment_status", "active")
      .not("display_name", "is", null)
      .order("display_name", { ascending: true });
    if (staffErr) throw staffErr;

    // ── 4. Project rows + accumulate counts + KPIs ─────────────────────
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthStartIso = monthStart.toISOString();
    const now = Date.now();

    let issuedCount = 0;
    let historyCount = 0;
    let oldestUnreturnedSeconds: number | null = null;
    let returnedThisMonthCount = 0;

    const rows: EquipmentListRow[] = (rawRows ?? []).map((r) => {
      const mat = r.materials as
        | { name: string; units: { abbreviation: string } | null }
        | null;
      // PostgREST cannot auto-introspect assigned_to → profiles; cast
      // through unknown per the TS error hint pattern reused throughout
      // the codebase.
      const assignee = r.assignee as unknown as
        | { display_name: string | null }
        | null;
      const isOpen = r.returned_at === null;

      if (isOpen) {
        issuedCount += 1;
        const ageSec = Math.floor(
          (now - new Date(r.assigned_at).getTime()) / 1000,
        );
        if (
          oldestUnreturnedSeconds === null ||
          ageSec > oldestUnreturnedSeconds
        ) {
          oldestUnreturnedSeconds = ageSec;
        }
      } else {
        historyCount += 1;
        if (r.returned_at && r.returned_at >= monthStartIso) {
          returnedThisMonthCount += 1;
        }
      }

      return {
        id: r.id,
        materialId: r.material_id,
        materialName: mat?.name ?? "Unknown material",
        baseUnitAbbreviation: mat?.units?.abbreviation ?? null,
        assignedToId: r.assigned_to,
        assignedToName: assignee?.display_name ?? null,
        assignedAt: r.assigned_at,
        returnedAt: r.returned_at,
        conditionOnReturn: r.condition_on_return,
        notes: r.notes,
      };
    });

    const kpis: EquipmentListKpis = {
      issuedCount,
      oldestUnreturnedSeconds,
      returnedThisMonthCount,
    };

    const returnableMaterials = (rawMaterials ?? []).map((m) => {
      const unit = m.units as { abbreviation: string } | null;
      return {
        id: m.id,
        name: m.name,
        sku: m.sku,
        baseUnitAbbreviation: unit?.abbreviation ?? null,
      };
    });

    const assignees: AssigneeOption[] = (rawStaff ?? []).flatMap((p) =>
      p.display_name
        ? [{ userId: p.id, displayName: p.display_name }]
        : [],
    );

    return {
      rows,
      counts: { issued: issuedCount, history: historyCount },
      kpis,
      returnableMaterials,
      assignees,
    };
  },
);
