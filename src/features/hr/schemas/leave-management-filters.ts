import { z } from "zod";

/**
 * URL-state Zod schema for the Leave Management page.
 *
 * Follows Pattern C / audit-standard: every filter is optional and
 * parsed from searchParams on the server.
 */

export const LEAVE_PAGE_SIZES = [10, 25, 50, 100] as const;
export const LEAVE_DEFAULT_PAGE_SIZE = 25;

export const leaveManagementFiltersSchema = z.object({
  /** Active tab. */
  tab: z.enum(["requests", "balances", "history", "policies", "types"]).optional(),
  /** Status filter for the requests tab. Defaults to 'pending' per spec. */
  status: z.string().default("pending"),
  /** Leave type filter. */
  leaveTypeId: z.string().optional(),
  /** Staff name search. */
  search: z.string().max(200).optional(),
  /** Keyset cursor for requests: `<created_at>|<id>`. */
  cursor: z.string().optional(),
  /** Keyset cursor for ledger history: `<created_at>|<id>`. */
  historyCursor: z.string().optional(),
  /** Rows per page. */
  pageSize: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]).optional(),
});

export type LeaveManagementFilters = z.infer<typeof leaveManagementFiltersSchema>;

/** Encode a keyset cursor from row values (created_at + id). */
export function encodeLeaveRequestCursor(createdAt: string, id: string): string {
  return `${createdAt}|${id}`;
}

/** Decode a keyset cursor. */
export function decodeLeaveRequestCursor(cursor: string | undefined): {
  createdAt: string;
  id: string;
} | null {
  if (!cursor) return null;
  const pipe = cursor.indexOf("|");
  if (pipe === -1) return null;
  const createdAt = cursor.slice(0, pipe);
  const id = cursor.slice(pipe + 1);
  if (!createdAt || !id) return null;
  return { createdAt, id };
}
