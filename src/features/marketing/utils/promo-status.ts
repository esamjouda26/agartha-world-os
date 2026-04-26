import type { PromoCodeRow, PromoTabKey } from "@/features/marketing/types";

/**
 * Bucket a promo into one of the four UI tabs (frontend_spec.md:2568).
 *
 * `lifecycle_status` only carries `draft|active|paused|completed`
 * (init_schema.sql:114). The "Expired" tab is the union of:
 *   - rows whose `valid_to` is in the past, regardless of status, AND
 *   - rows with status='completed' (terminal lifecycle).
 *
 * Used by both the RSC count tally and the client tab filter so server
 * counts and rendered rows agree exactly.
 */
export function classifyPromo(row: PromoCodeRow, nowMs: number): PromoTabKey {
  const expired = new Date(row.validTo).getTime() < nowMs;
  if (row.status === "draft") return "draft";
  if (row.status === "paused") return "paused";
  if (expired || row.status === "completed") return "expired";
  return "active";
}

/**
 * Day-of-week bitmask helpers. PostgreSQL ISODOW: Mon=1, Tue=2, ... Sun=7.
 * Bit value = 1 << (ISODOW - 1) → Mon=1, Tue=2, Wed=4, Thu=8, Fri=16,
 * Sat=32, Sun=64. NULL = all days (no restriction).
 */
export const ISODOW_DAYS = [
  { isodow: 1, mask: 1, short: "Mon", long: "Monday" },
  { isodow: 2, mask: 2, short: "Tue", long: "Tuesday" },
  { isodow: 3, mask: 4, short: "Wed", long: "Wednesday" },
  { isodow: 4, mask: 8, short: "Thu", long: "Thursday" },
  { isodow: 5, mask: 16, short: "Fri", long: "Friday" },
  { isodow: 6, mask: 32, short: "Sat", long: "Saturday" },
  { isodow: 7, mask: 64, short: "Sun", long: "Sunday" },
] as const;

export const ALL_DAYS_MASK = 127;
