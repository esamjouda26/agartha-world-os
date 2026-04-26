import { z } from "zod";

/**
 * URL-state Zod schema for the Attendance Ledger filter bar.
 *
 * Every field is optional; omitted fields mean "no filter on this axis."
 * The wrapper Server Component parses `searchParams` through this and
 * forwards the narrowed shape to `getAttendanceLedgerData`.
 *
 * Follows the same Pattern C convention as `auditFiltersSchema`.
 */

export const ATTENDANCE_LEDGER_PAGE_SIZES = [10, 25, 50, 100] as const;
export type AttendanceLedgerPageSize = (typeof ATTENDANCE_LEDGER_PAGE_SIZES)[number];
export const ATTENDANCE_LEDGER_DEFAULT_PAGE_SIZE = 25;

export const attendanceLedgerFiltersSchema = z.object({
  /** Start date (ISO `YYYY-MM-DD`). Defaults to today on the server. */
  from: z.string().date().optional(),
  /** End date (ISO `YYYY-MM-DD`). Defaults to today on the server. */
  to: z.string().date().optional(),
  /** Derived status narrow. */
  status: z.string().optional(),
  /** Org unit name narrow. */
  orgUnit: z.string().optional(),
  /** Shift type code narrow. */
  shiftType: z.string().optional(),
  /** Free text search on staff name / shift name. */
  search: z.string().max(200).optional(),
  /** Keyset cursor: `<shift_date>|<shift_schedule_id>`. */
  cursor: z.string().optional(),
  /** Rows per page. Bounded by `ATTENDANCE_LEDGER_PAGE_SIZES`. */
  pageSize: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]).optional(),
});

export type AttendanceLedgerFilters = z.infer<typeof attendanceLedgerFiltersSchema>;

/**
 * Resolve the (from, to) date range from parsed filters.
 * Returns today when no explicit range is provided.
 */
export function resolveDateRange(filters: AttendanceLedgerFilters): { from: string; to: string } {
  const today = new Date().toISOString().slice(0, 10);
  return {
    from: filters.from ?? today,
    to: filters.to ?? today,
  };
}

/** Encode a keyset cursor from row values. */
export function encodeCursor(shiftDate: string, shiftScheduleId: string): string {
  return `${shiftDate}|${shiftScheduleId}`;
}

/** Decode a keyset cursor back to components. */
export function decodeCursor(cursor: string | undefined): {
  shiftDate: string;
  shiftScheduleId: string;
} | null {
  if (!cursor) return null;
  const [shiftDate, shiftScheduleId] = cursor.split("|");
  if (!shiftDate || !shiftScheduleId) return null;
  return { shiftDate, shiftScheduleId };
}
