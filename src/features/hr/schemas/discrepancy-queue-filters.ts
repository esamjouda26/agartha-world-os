import { z } from "zod";

/**
 * URL-state Zod schema for the Discrepancy Queue page.
 *
 * Follows Pattern C / audit-standard: every filter is optional and
 * parsed from searchParams on the server. Queue is always
 * `status = 'pending_review'` so no status filter needed.
 */

export const QUEUE_PAGE_SIZES = [10, 25, 50, 100] as const;
export const QUEUE_DEFAULT_PAGE_SIZE = 25;

export const discrepancyQueueFiltersSchema = z.object({
  /** Exception type narrow (e.g. late_arrival, absent). */
  exceptionType: z.string().optional(),
  /** Staff name search. */
  search: z.string().max(200).optional(),
  /** Keyset cursor: `<clarification_submitted_at>|<id>`. */
  cursor: z.string().optional(),
  /** Rows per page. */
  pageSize: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]).optional(),
});

export type DiscrepancyQueueFilters = z.infer<typeof discrepancyQueueFiltersSchema>;

/** Encode a keyset cursor from row values. */
export function encodeQueueCursor(submittedAt: string, id: string): string {
  return `${submittedAt}|${id}`;
}

/** Decode a keyset cursor. */
export function decodeQueueCursor(cursor: string | undefined): {
  submittedAt: string;
  id: string;
} | null {
  if (!cursor) return null;
  const pipe = cursor.indexOf("|");
  if (pipe === -1) return null;
  const submittedAt = cursor.slice(0, pipe);
  const id = cursor.slice(pipe + 1);
  if (!submittedAt || !id) return null;
  return { submittedAt, id };
}
