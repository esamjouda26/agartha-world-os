import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  MovementDirection,
  MovementsLedgerData,
  MovementsLedgerKpis,
  MovementsLedgerRow,
} from "@/features/inventory/types";
import {
  MOVEMENTS_LEDGER_DEFAULT_LOOKBACK_DAYS,
  MOVEMENTS_LEDGER_DEFAULT_PAGE_SIZE,
  MOVEMENTS_LEDGER_KPI_MAX_ROWS,
  MOVEMENTS_LEDGER_PAGE_SIZE_OPTIONS,
} from "@/features/inventory/constants";

/**
 * Cursor format: `<isoDate>|<uuid>` — keyset on
 * (goods_movements.document_date DESC, goods_movements.id DESC).
 *
 * Note: the cursor anchors to the parent goods_movement, not to the
 * displayed item row. Pagination granularity is therefore
 * "pageSize movements" (each may yield N item rows on screen).
 */
const CURSOR_DELIMITER = "|";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function decodeCursor(token: string | null): { date: string; id: string } | null {
  if (!token) return null;
  const parts = token.split(CURSOR_DELIMITER);
  if (parts.length !== 2) return null;
  const [date, id] = parts;
  if (!date || !id || !ISO_DATE.test(date)) return null;
  return { date, id };
}

function encodeCursor(date: string, id: string): string {
  return `${date}${CURSOR_DELIMITER}${id}`;
}

/**
 * Resolve the source document FK on a goods_movements row to a label
 * + management-portal href when one exists. The `disposal_id` chain
 * has no detail page in v1 (write-offs is a list-only surface), so
 * the href is null for that kind.
 */
function resolveSourceDoc(
  gm: Readonly<{
    purchase_order_id: string | null;
    requisition_id: string | null;
    reconciliation_id: string | null;
    order_id: string | null;
    disposal_id: string | null;
  }>,
): MovementsLedgerRow["sourceDoc"] {
  if (gm.purchase_order_id) {
    return {
      kind: "po",
      id: gm.purchase_order_id,
      label: `PO ${gm.purchase_order_id.slice(0, 8)}`,
      href: `/management/procurement/purchase-orders/${gm.purchase_order_id}`,
    };
  }
  if (gm.requisition_id) {
    return {
      kind: "requisition",
      id: gm.requisition_id,
      label: `REQ ${gm.requisition_id.slice(0, 8)}`,
      href: `/management/inventory/requisitions/${gm.requisition_id}`,
    };
  }
  if (gm.reconciliation_id) {
    return {
      kind: "reconciliation",
      id: gm.reconciliation_id,
      label: `RECON ${gm.reconciliation_id.slice(0, 8)}`,
      href: `/management/inventory/reconciliation/${gm.reconciliation_id}`,
    };
  }
  if (gm.order_id) {
    return {
      kind: "order",
      id: gm.order_id,
      label: `ORD ${gm.order_id.slice(0, 8)}`,
      // POS order detail route exists at /management/pos/orders, but
      // detail pages are out of Phase 7 scope for the POS domain. Link
      // to the order monitor list instead.
      href: `/management/pos/orders`,
    };
  }
  if (gm.disposal_id) {
    return {
      kind: "disposal",
      id: gm.disposal_id,
      label: `DISP ${gm.disposal_id.slice(0, 8)}`,
      // Write-offs page is list-only — no per-id detail surface.
      href: null,
    };
  }
  return null;
}

export type GetMovementsLedgerInput = Readonly<{
  movementTypeId: string | null;
  materialId: string | null;
  locationId: string | null;
  /** YYYY-MM-DD inclusive lower bound on document_date. */
  fromDate: string | null;
  /** YYYY-MM-DD inclusive upper bound on document_date. */
  toDate: string | null;
  cursor: string | null;
  pageSize: number;
}>;

/**
 * RSC query — payload for the Ledger tab of `/management/inventory/movements`.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup. RLS
 * `inventory_ops:r` (init_schema.sql:2702-2703) gates SELECT.
 *
 * Pagination: cursor on (document_date, id) DESC. Server fetches
 * `pageSize + 1` parent movements; flattens children into per-item
 * display rows.
 *
 * KPIs are computed in a separate aggregate pass over the active
 * period — bounded by `MOVEMENTS_LEDGER_KPI_MAX_ROWS` to keep latency
 * predictable on this high-volume table.
 */
export const getMovementsLedger = cache(
  async (
    client: SupabaseClient<Database>,
    input: GetMovementsLedgerInput,
  ): Promise<MovementsLedgerData> => {
    const pageSize = MOVEMENTS_LEDGER_PAGE_SIZE_OPTIONS.includes(
      input.pageSize as 25 | 50 | 100,
    )
      ? input.pageSize
      : MOVEMENTS_LEDGER_DEFAULT_PAGE_SIZE;

    // ── 1. Resolve KPI period ─────────────────────────────────────────
    const now = new Date();
    const periodEnd = input.toDate ?? now.toISOString().slice(0, 10);
    const periodStart =
      input.fromDate ??
      (() => {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - MOVEMENTS_LEDGER_DEFAULT_LOOKBACK_DAYS);
        return d.toISOString().slice(0, 10);
      })();

    const cursor = decodeCursor(input.cursor);

    // ── 2. Page of parent movements ───────────────────────────────────
    let movementsQuery = client
      .from("goods_movements")
      .select(
        `
        id,
        movement_type_id,
        document_date,
        posting_date,
        purchase_order_id,
        requisition_id,
        reconciliation_id,
        order_id,
        disposal_id,
        notes,
        created_at,
        movement_types!goods_movements_movement_type_id_fkey (
          code, name, direction
        )
        `,
      )
      .order("document_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (input.movementTypeId) {
      movementsQuery = movementsQuery.eq(
        "movement_type_id",
        input.movementTypeId,
      );
    }
    if (input.fromDate) {
      movementsQuery = movementsQuery.gte("document_date", input.fromDate);
    }
    if (input.toDate) {
      movementsQuery = movementsQuery.lte("document_date", input.toDate);
    }
    if (cursor) {
      // Keyset compare via PostgREST `.or()` — strict (date, id) <
      // (cursor.date, cursor.id) ordering.
      movementsQuery = movementsQuery.or(
        `document_date.lt.${cursor.date},and(document_date.eq.${cursor.date},id.lt.${cursor.id})`,
      );
    }

    const { data: rawMovements, error: mErr } = await movementsQuery;
    if (mErr) throw mErr;

    const slicedMovements = (rawMovements ?? []).slice(0, pageSize);
    const hasMore = (rawMovements?.length ?? 0) > pageSize;
    const lastMovement = slicedMovements[slicedMovements.length - 1];
    const nextCursor =
      hasMore && lastMovement
        ? encodeCursor(lastMovement.document_date, lastMovement.id)
        : null;

    // ── 3. Items for those movements ──────────────────────────────────
    const movementIds = slicedMovements.map((m) => m.id);
    let rawItems: ReadonlyArray<{
      id: string;
      goods_movement_id: string;
      material_id: string;
      quantity: number;
      unit_id: string;
      location_id: string;
      unit_cost: number;
      // GENERATED ALWAYS AS (ABS(quantity)*unit_cost) — typegen marks
      // it nullable.
      total_cost: number | null;
    }> = [];
    let materialMap = new Map<
      string,
      { name: string }
    >();
    let locationMap = new Map<string, { name: string }>();
    let unitMap = new Map<string, { abbreviation: string }>();
    if (movementIds.length > 0) {
      const itemsQuery = client
        .from("goods_movement_items")
        .select(
          "id, goods_movement_id, material_id, quantity, unit_id, location_id, unit_cost, total_cost",
        )
        .in("goods_movement_id", movementIds);
      const filteredItemsQuery = (() => {
        let q = itemsQuery;
        if (input.materialId) q = q.eq("material_id", input.materialId);
        if (input.locationId) q = q.eq("location_id", input.locationId);
        return q;
      })();
      const { data: itemsRows, error: iErr } = await filteredItemsQuery;
      if (iErr) throw iErr;
      rawItems = itemsRows ?? [];

      const materialIds = Array.from(
        new Set(rawItems.map((i) => i.material_id)),
      );
      const locationIds = Array.from(
        new Set(rawItems.map((i) => i.location_id)),
      );
      const unitIds = Array.from(new Set(rawItems.map((i) => i.unit_id)));

      if (materialIds.length > 0) {
        const { data, error } = await client
          .from("materials")
          .select("id, name")
          .in("id", materialIds);
        if (error) throw error;
        materialMap = new Map(
          (data ?? []).map((m) => [m.id, { name: m.name }]),
        );
      }
      if (locationIds.length > 0) {
        const { data, error } = await client
          .from("locations")
          .select("id, name")
          .in("id", locationIds);
        if (error) throw error;
        locationMap = new Map(
          (data ?? []).map((l) => [l.id, { name: l.name }]),
        );
      }
      if (unitIds.length > 0) {
        const { data, error } = await client
          .from("units")
          .select("id, abbreviation")
          .in("id", unitIds);
        if (error) throw error;
        unitMap = new Map(
          (data ?? []).map((u) => [u.id, { abbreviation: u.abbreviation }]),
        );
      }
    }

    // ── 4. KPIs (period aggregate, capped row scan) ───────────────────
    let kpiQuery = client
      .from("goods_movements")
      .select(
        `
        id,
        movement_type_id,
        document_date,
        movement_types!goods_movements_movement_type_id_fkey ( direction )
        `,
      )
      .gte("document_date", periodStart)
      .lte("document_date", periodEnd)
      .limit(MOVEMENTS_LEDGER_KPI_MAX_ROWS);
    if (input.movementTypeId) {
      kpiQuery = kpiQuery.eq("movement_type_id", input.movementTypeId);
    }
    const { data: kpiRows, error: kErr } = await kpiQuery;
    if (kErr) throw kErr;

    let totalCount = 0;
    let inboundCount = 0;
    let outboundCount = 0;
    let transferCount = 0;
    for (const k of kpiRows ?? []) {
      totalCount += 1;
      const mt = k.movement_types as { direction: string } | null;
      switch (mt?.direction) {
        case "in":
          inboundCount += 1;
          break;
        case "out":
          outboundCount += 1;
          break;
        case "transfer":
          transferCount += 1;
          break;
      }
    }
    const kpis: MovementsLedgerKpis = {
      totalCount,
      inboundCount,
      outboundCount,
      transferCount,
      periodStart,
      periodEnd,
    };

    // ── 5. Reference data for filter pickers ──────────────────────────
    const { data: rawMt, error: mtErr } = await client
      .from("movement_types")
      .select("id, code, name, direction, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true });
    if (mtErr) throw mtErr;

    const { data: rawMaterials, error: matErr } = await client
      .from("materials")
      .select("id, name, sku, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (matErr) throw matErr;

    const { data: rawLocations, error: locErr } = await client
      .from("locations")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (locErr) throw locErr;

    // ── 6. Project ledger rows ────────────────────────────────────────
    const movementById = new Map<string, (typeof slicedMovements)[number]>();
    for (const m of slicedMovements) movementById.set(m.id, m);

    const rows: MovementsLedgerRow[] = rawItems.flatMap((item) => {
      const m = movementById.get(item.goods_movement_id);
      if (!m) return [];
      const mt = m.movement_types as
        | { code: string; name: string; direction: string }
        | null;
      const mat = materialMap.get(item.material_id);
      const loc = locationMap.get(item.location_id);
      const unit = unitMap.get(item.unit_id);
      const sourceDoc = resolveSourceDoc(m);
      return [
        {
          rowId: `${m.id}:${item.id}`,
          goodsMovementId: m.id,
          itemId: item.id,
          documentDate: m.document_date,
          postingDate: m.posting_date,
          movementTypeCode: mt?.code ?? "??",
          movementTypeName: mt?.name ?? "Unknown",
          direction: (mt?.direction as MovementDirection) ?? "neutral",
          materialId: item.material_id,
          materialName: mat?.name ?? "Unknown material",
          quantity: Number(item.quantity ?? 0),
          unitAbbreviation: unit?.abbreviation ?? null,
          locationId: item.location_id,
          locationName: loc?.name ?? "Unknown location",
          unitCost: Number(item.unit_cost ?? 0),
          totalCost: Number(item.total_cost ?? 0),
          sourceDoc,
          notes: m.notes,
        } satisfies MovementsLedgerRow,
      ];
    });

    // Stable order — by document_date DESC then movement_id DESC then item_id ASC.
    rows.sort((a, b) => {
      if (a.documentDate !== b.documentDate) {
        return a.documentDate < b.documentDate ? 1 : -1;
      }
      if (a.goodsMovementId !== b.goodsMovementId) {
        return a.goodsMovementId < b.goodsMovementId ? 1 : -1;
      }
      return a.itemId < b.itemId ? -1 : 1;
    });

    return {
      rows,
      kpis,
      nextCursor,
      movementTypes: (rawMt ?? []).map((mt) => ({
        id: mt.id,
        code: mt.code,
        name: mt.name,
        direction: mt.direction as MovementDirection,
      })),
      materials: (rawMaterials ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        sku: m.sku,
      })),
      locations: (rawLocations ?? []).map((l) => ({
        id: l.id,
        name: l.name,
      })),
    };
  },
);
