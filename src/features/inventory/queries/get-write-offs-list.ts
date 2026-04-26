import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  DisposalReason,
  WriteOffListData,
  WriteOffListKpis,
  WriteOffListRow,
  WriteOffReviewedFilter,
} from "@/features/inventory/types";
import {
  WRITE_OFFS_DEFAULT_LOOKBACK_DAYS,
  WRITE_OFFS_DEFAULT_PAGE_SIZE,
  WRITE_OFFS_PAGE_SIZE_OPTIONS,
} from "@/features/inventory/constants";

/**
 * Cursor format: `<isoTimestamp>|<uuid>` — keyset on
 * (write_offs.created_at DESC, write_offs.id DESC).
 *
 * Compatible with `<CursorPagination>`'s default `~`-delimited crumb
 * stack since the cursor token contains a `|` rather than `~`.
 */
const CURSOR_DELIMITER = "|";

function decodeCursor(token: string | null): { ts: string; id: string } | null {
  if (!token) return null;
  const parts = token.split(CURSOR_DELIMITER);
  if (parts.length !== 2) return null;
  const [ts, id] = parts;
  if (!ts || !id) return null;
  // Defensive validation — bad cursors silently fall back to head.
  if (!/^\d{4}-\d{2}-\d{2}T/.test(ts)) return null;
  return { ts, id };
}

function encodeCursor(ts: string, id: string): string {
  return `${ts}${CURSOR_DELIMITER}${id}`;
}

export type GetWriteOffsListInput = Readonly<{
  reviewedFilter: WriteOffReviewedFilter;
  reasonFilter: DisposalReason | null;
  materialFilter: string | null;
  locationFilter: string | null;
  /** YYYY-MM-DD inclusive lower bound on created_at. */
  fromDate: string | null;
  /** YYYY-MM-DD inclusive upper bound on created_at. */
  toDate: string | null;
  cursor: string | null;
  pageSize: number;
}>;

/**
 * RSC query — payload for `/management/inventory/write-offs`.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup. RLS
 * Tier 3 (`inventory_ops` OR `pos`) gates SELECT differently per
 * principal — `inventory_ops:r` sees ALL rows, `pos:r` sees only rows
 * for materials in POS-owned categories. The query body is identical
 * either way; RLS does the filtering.
 *
 * Cursor pagination: keyset on `(created_at, id)` DESC. Server fetches
 * `pageSize + 1` rows so it can infer whether a next page exists
 * without a separate count round-trip.
 *
 * KPIs are computed in a separate aggregate pass (independent of the
 * cursor slice) so they reflect the active filters but not the page
 * window.
 */
export const getWriteOffsList = cache(
  async (
    client: SupabaseClient<Database>,
    input: GetWriteOffsListInput,
  ): Promise<WriteOffListData> => {
    const pageSize = WRITE_OFFS_PAGE_SIZE_OPTIONS.includes(
      input.pageSize as 25 | 50 | 100,
    )
      ? input.pageSize
      : WRITE_OFFS_DEFAULT_PAGE_SIZE;

    // ── 1. Resolve the active period for KPIs ──────────────────────────
    //
    // If the user passed a date range, use it. Otherwise default to the
    // last `WRITE_OFFS_DEFAULT_LOOKBACK_DAYS` days so "Total waste this
    // period" / "Estimated cost" frame as a rolling window.
    const now = new Date();
    const periodEnd = input.toDate ?? now.toISOString().slice(0, 10);
    const periodStart =
      input.fromDate ??
      (() => {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - WRITE_OFFS_DEFAULT_LOOKBACK_DAYS);
        return d.toISOString().slice(0, 10);
      })();
    const periodStartTs = `${periodStart}T00:00:00.000Z`;
    const periodEndTs = `${periodEnd}T23:59:59.999Z`;

    // ── 2. Cursor decode ──────────────────────────────────────────────
    const cursor = decodeCursor(input.cursor);

    // ── 3. Build base query for the row slice ─────────────────────────
    let rowsQuery = client
      .from("write_offs")
      .select(
        `
        id,
        material_id,
        location_id,
        reason,
        quantity,
        unit_cost,
        total_cost,
        photo_proof_url,
        notes,
        disposed_by,
        reviewed_by,
        reviewed_at,
        created_at,
        materials!write_offs_material_id_fkey (
          name,
          units!materials_base_unit_id_fkey ( abbreviation )
        ),
        locations!write_offs_location_id_fkey ( name ),
        disposed_by_profile:profiles!write_offs_disposed_by_fkey ( display_name ),
        reviewed_by_profile:profiles!write_offs_reviewed_by_fkey ( display_name )
        `,
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (input.reviewedFilter === "unreviewed") {
      rowsQuery = rowsQuery.is("reviewed_at", null);
    } else if (input.reviewedFilter === "reviewed") {
      rowsQuery = rowsQuery.not("reviewed_at", "is", null);
    }
    if (input.reasonFilter) {
      rowsQuery = rowsQuery.eq("reason", input.reasonFilter);
    }
    if (input.materialFilter) {
      rowsQuery = rowsQuery.eq("material_id", input.materialFilter);
    }
    if (input.locationFilter) {
      rowsQuery = rowsQuery.eq("location_id", input.locationFilter);
    }
    if (input.fromDate) {
      rowsQuery = rowsQuery.gte("created_at", `${input.fromDate}T00:00:00.000Z`);
    }
    if (input.toDate) {
      rowsQuery = rowsQuery.lte("created_at", `${input.toDate}T23:59:59.999Z`);
    }

    // Keyset pagination: rows strictly older than the cursor anchor.
    // PostgreSQL row-value comparison via PostgREST `.or()` —
    // (created_at < $ts) OR (created_at = $ts AND id < $id).
    if (cursor) {
      const cursorTs = cursor.ts.replace(/,/g, "");
      rowsQuery = rowsQuery.or(
        `created_at.lt.${cursorTs},and(created_at.eq.${cursorTs},id.lt.${cursor.id})`,
      );
    }

    const { data: rawRows, error: rowsErr } = await rowsQuery;
    if (rowsErr) throw rowsErr;

    const sliced = (rawRows ?? []).slice(0, pageSize);
    const hasMore = (rawRows?.length ?? 0) > pageSize;
    const last = sliced[sliced.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor(last.created_at, last.id) : null;

    // ── 4. KPIs (aggregate over period; pagination-independent) ──────
    //
    // We pull a slim projection across the period range and reduce in
    // JS. write_offs is high-volume, but the period bound + active
    // filters make this practical for v1. Phase-10 hardening can move
    // this to a materialized view.
    let kpiQuery = client
      .from("write_offs")
      .select("id, reason, quantity, total_cost, reviewed_at, created_at")
      .gte("created_at", periodStartTs)
      .lte("created_at", periodEndTs);
    if (input.reasonFilter)
      kpiQuery = kpiQuery.eq("reason", input.reasonFilter);
    if (input.materialFilter)
      kpiQuery = kpiQuery.eq("material_id", input.materialFilter);
    if (input.locationFilter)
      kpiQuery = kpiQuery.eq("location_id", input.locationFilter);
    const { data: rawKpiRows, error: kpiErr } = await kpiQuery;
    if (kpiErr) throw kpiErr;

    let totalWasteQty = 0;
    let estimatedCost = 0;
    const reasonCounts = new Map<DisposalReason, number>();
    for (const r of rawKpiRows ?? []) {
      totalWasteQty += Number(r.quantity ?? 0);
      estimatedCost += Number(r.total_cost ?? 0);
      const reason = r.reason as DisposalReason;
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
    let topReason: DisposalReason | null = null;
    let topReasonCount = 0;
    for (const [reason, count] of reasonCounts.entries()) {
      if (count > topReasonCount) {
        topReason = reason;
        topReasonCount = count;
      }
    }

    // Unreviewed count is independent of date/period — surfaces the
    // queue depth at all times so the manager always sees backlog.
    const { count: unreviewedRaw, error: unreviewedErr } = await client
      .from("write_offs")
      .select("id", { count: "exact", head: true })
      .is("reviewed_at", null);
    if (unreviewedErr) throw unreviewedErr;

    const kpis: WriteOffListKpis = {
      unreviewedCount: unreviewedRaw ?? 0,
      totalWasteQty,
      topReason,
      topReasonCount,
      estimatedCost,
      periodStart,
      periodEnd,
    };

    // ── 5. Reference data for filter pickers ──────────────────────────
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

    // ── 6. Project rows ───────────────────────────────────────────────
    const rows: WriteOffListRow[] = sliced.map((r) => {
      const mat = r.materials as
        | { name: string; units: { abbreviation: string } | null }
        | null;
      const loc = r.locations as { name: string } | null;
      // PostgREST cannot auto-introspect FK→profiles via auth.users —
      // cast through unknown per the TS error hint pattern reused
      // throughout the codebase (procurement / requisitions).
      const disposed = r.disposed_by_profile as unknown as
        | { display_name: string | null }
        | null;
      const reviewed = r.reviewed_by_profile as unknown as
        | { display_name: string | null }
        | null;
      return {
        id: r.id,
        materialId: r.material_id,
        materialName: mat?.name ?? "Unknown material",
        baseUnitAbbreviation: mat?.units?.abbreviation ?? null,
        locationId: r.location_id,
        locationName: loc?.name ?? "Unknown location",
        reason: r.reason as DisposalReason,
        quantity: Number(r.quantity ?? 0),
        unitCost: Number(r.unit_cost ?? 0),
        totalCost: Number(r.total_cost ?? 0),
        hasPhoto: Boolean(r.photo_proof_url),
        disposedById: r.disposed_by,
        disposedByName: disposed?.display_name ?? null,
        reviewedAt: r.reviewed_at,
        reviewedByName: reviewed?.display_name ?? null,
        notes: r.notes,
        createdAt: r.created_at,
      };
    });

    return {
      rows,
      kpis,
      nextCursor,
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
