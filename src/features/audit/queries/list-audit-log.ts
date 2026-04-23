import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AUDIT_PAGE_SIZE, type AuditAction } from "@/features/audit/constants";
import type { AuditFilters } from "@/features/audit/schemas/filters";
import { decodeCursor, resolveDateRange } from "@/features/audit/schemas/filters";

/** Resolve the effective page size — caller-supplied `pageSize` URL param
 *  wins; falls back to the default `AUDIT_PAGE_SIZE`. The schema already
 *  bounds the input to a known-safe set, so no runtime guard is needed
 *  beyond the nullish-coalesce. */
function resolvePageSize(filters: AuditFilters): number {
  return filters.pageSize ?? AUDIT_PAGE_SIZE;
}

export type AuditLogRow = Readonly<{
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string | null;
  performedByName: string;
  ipAddress: string | null;
  createdAt: string;
}>;

export type AuditLogPage = Readonly<{
  rows: readonly AuditLogRow[];
  /** Cursor for the next page, or null if this is the last page. */
  nextCursor: { createdAt: string; id: string } | null;
  /** Reflects whether a cursor was supplied (i.e. we're NOT on page 1). */
  hasPrev: boolean;
}>;

/**
 * Fetch one keyset-paginated page of audit log rows narrowed by the
 * caller's domain-filtered entity types + URL filter state.
 *
 * Keyset cursor ordering: `ORDER BY created_at DESC, id DESC`.
 * The cursor points to the last row of the previous page; the next
 * page starts with rows strictly before `(cursor.createdAt, cursor.id)`.
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup. The
 * query is RLS-scoped (`system_audit_log_select` on `reports:r`),
 * so `unstable_cache` is off-limits.
 *
 * Perf notes: the `created_at` column has no explicit index in
 * init_schema, but the table is partitioned by `created_at` per
 * CLAUDE.md §2 roadmap (not in current migration set — flagged for
 * Phase 10). For the current data volume, a full index scan is
 * acceptable; add `CREATE INDEX CONCURRENTLY idx_system_audit_log_created_at
 * ON system_audit_log (created_at DESC, id DESC)` when row count
 * exceeds ~1M.
 */
export const listAuditLog = cache(
  async (params: {
    allowedEntityTypes: readonly string[];
    filters: AuditFilters;
  }): Promise<AuditLogPage> => {
    if (params.allowedEntityTypes.length === 0) {
      return { rows: [], nextCursor: null, hasPrev: false };
    }

    const supabase = await createSupabaseServerClient();
    const cursor = decodeCursor(params.filters.cursor);
    const dateRange = resolveDateRange(params.filters);
    const pageSize = resolvePageSize(params.filters);

    let builder = supabase
      .from("system_audit_log")
      .select(
        "id, action, entity_type, entity_id, old_values, new_values, performed_by, ip_address, created_at",
      )
      .in("entity_type", [...params.allowedEntityTypes])
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1); // +1 to detect "has next"

    // Filter: entity_type narrow
    if (params.filters.entityType) {
      builder = builder.eq("entity_type", params.filters.entityType);
    }
    // Filter: action narrow
    if (params.filters.action) {
      builder = builder.eq("action", params.filters.action);
    }
    // Filter: entity_id exact (UUID/PK search)
    if (params.filters.entityId) {
      builder = builder.eq("entity_id", params.filters.entityId);
    }
    // Filter: performed_by UUID
    if (params.filters.performedBy) {
      builder = builder.eq("performed_by", params.filters.performedBy);
    }
    // Filter: date range
    if (dateRange) {
      builder = builder
        .gte("created_at", `${dateRange.from}T00:00:00Z`)
        .lte("created_at", `${dateRange.to}T23:59:59.999Z`);
    }
    // Keyset cursor: "strictly before (cursor.createdAt, cursor.id)" in DESC order.
    // `a < x OR (a = x AND b < y)` is the canonical tuple-comparison form.
    if (cursor) {
      builder = builder.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await builder;
    if (error) throw error;
    const rows = data ?? [];

    // Split off the sentinel row for "has next" detection.
    const hasNext = rows.length > pageSize;
    const pageRows = hasNext ? rows.slice(0, pageSize) : rows;

    // Resolve performed_by display names — single round-trip.
    const performerIds = Array.from(
      new Set(pageRows.map((r) => r.performed_by).filter((v): v is string => v !== null)),
    );
    const displayNameById = new Map<string, string>();
    if (performerIds.length > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", performerIds);
      if (pErr) throw pErr;
      for (const p of profiles ?? []) displayNameById.set(p.id, p.display_name ?? "");
    }

    const typedRows: AuditLogRow[] = pageRows.map((row) => ({
      id: row.id,
      action: row.action as AuditAction,
      entityType: row.entity_type,
      entityId: row.entity_id,
      oldValues: (row.old_values ?? null) as Record<string, unknown> | null,
      newValues: (row.new_values ?? null) as Record<string, unknown> | null,
      performedBy: row.performed_by,
      performedByName: row.performed_by ? (displayNameById.get(row.performed_by) ?? "") : "",
      ipAddress: typeof row.ip_address === "string" ? row.ip_address : null,
      createdAt: row.created_at,
    }));

    const nextCursorRow = hasNext ? pageRows[pageRows.length - 1] : null;
    const nextCursor = nextCursorRow
      ? { createdAt: nextCursorRow.created_at, id: nextCursorRow.id }
      : null;

    return {
      rows: typedRows,
      nextCursor,
      hasPrev: cursor !== null,
    };
  },
);
