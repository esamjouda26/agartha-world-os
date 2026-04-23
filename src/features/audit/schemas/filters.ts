import { z } from "zod";

import { AUDIT_ACTIONS, KNOWN_ENTITY_TYPES } from "@/features/audit/constants";

/**
 * Allowed page sizes for the audit table. Bounded to prevent unbounded
 * memory pressure from a malicious URL setting `pageSize=100000`.
 * Mirror these in the client-side `<CursorPagination pageSizeOptions>`.
 */
export const AUDIT_PAGE_SIZES = [10, 25, 50, 100] as const;
export type AuditPageSize = (typeof AUDIT_PAGE_SIZES)[number];

/**
 * URL-state Zod schema for the audit table's filter bar. Each field
 * is optional; omitted fields mean "no filter on this axis." The
 * wrapper Server Component parses `searchParams` through this and
 * forwards the narrowed shape to `listAuditLog`.
 *
 * `cursor` encodes a keyset pagination pointer as `<iso-ts>|<uuid>`.
 * `resetCursor` (boolean flag) lets "Reset to top" re-seed without
 * carrying stale cursor state in other URLs.
 */
export const auditFiltersSchema = z.object({
  /** Entity type narrow — matches one of KNOWN_ENTITY_TYPES. */
  entityType: z.enum([...KNOWN_ENTITY_TYPES] as [string, ...string[]]).optional(),
  /** Action narrow. */
  action: z.enum([...AUDIT_ACTIONS] as [string, ...string[]]).optional(),
  /** Exact entity-id search (no partial match — it's a UUID/PK). */
  entityId: z.string().trim().min(1).max(100).optional(),
  /** Performed-by narrow — UUID of a `profiles` row. */
  performedBy: z.guid().optional(),
  /** Date range preset OR explicit ISO range. */
  preset: z.enum(["today", "last_7_days", "last_30_days", "last_90_days", "custom"]).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  /** Keyset cursor: `<created_at_iso>|<id>`.
   *
   * The timestamp half accepts EITHER `Z` (UTC zulu) OR `±HH:MM` offset
   * — Postgres `TIMESTAMPTZ` returns the latter via Supabase JS by
   * default (e.g. `2026-04-18T07:24:56.820039+00:00`), so encoding the
   * cursor straight from the row's `created_at` produces the offset
   * form. A previous version only accepted `Z` and rejected every
   * cursor we round-tripped, breaking pagination. */
  cursor: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})\|[0-9a-fA-F-]{32,36}$/,
      "Invalid cursor format.",
    )
    .optional(),
  /** Rows per page. Bounded by `AUDIT_PAGE_SIZES`. */
  pageSize: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]).optional(),
});
export type AuditFilters = z.infer<typeof auditFiltersSchema>;

/** Encode + decode cursor as `<iso>|<uuid>`. Base64 isn't needed — the
 *  components are URL-safe. */
export function encodeCursor(createdAt: string, id: string): string {
  return `${createdAt}|${id}`;
}

export function decodeCursor(cursor: string | undefined): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  const [createdAt, id] = cursor.split("|");
  if (!createdAt || !id) return null;
  return { createdAt, id };
}

/**
 * Resolve a `(from, to)` ISO date-range tuple from the filter state.
 * Returns `null` when no range was requested (the query uses the
 * default "last 7 days" window downstream).
 */
export function resolveDateRange(filters: AuditFilters): { from: string; to: string } | null {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Explicit `from`/`to` pair wins over `preset` — the new `<DateRangePicker>`
  // UI always writes this pair (no `preset` URL param). The preset branch
  // below is kept for back-compat with bookmarked URLs that predate the
  // picker migration.
  if (filters.from && filters.to) {
    return { from: filters.from, to: filters.to };
  }
  if (filters.preset === "custom" && filters.from && filters.to) {
    return { from: filters.from, to: filters.to };
  }
  if (filters.preset === "today") return { from: today, to: today };

  const minusDays = (days: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  switch (filters.preset) {
    case "last_7_days":
      return { from: minusDays(7), to: today };
    case "last_30_days":
      return { from: minusDays(30), to: today };
    case "last_90_days":
      return { from: minusDays(90), to: today };
    default:
      return null;
  }
}
