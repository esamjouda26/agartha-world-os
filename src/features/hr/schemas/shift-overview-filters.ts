import { z } from "zod";

export const SHIFT_OVERVIEW_PAGE_SIZES = [10, 25, 50, 100] as const;
export const SHIFT_OVERVIEW_DEFAULT_PAGE_SIZE = 25;

export const shiftOverviewFiltersSchema = z.object({
  /** Staff name text search. */
  staffSearch: z.string().min(1).max(100).optional(),
  /** Narrow to a specific shift type by ID. */
  shiftTypeId: z.guid().optional(),
  /** When "true", only overridden schedules are shown. */
  override: z.literal("true").optional(),
  /** Date range lower bound (ISO date YYYY-MM-DD). */
  from: z.string().date().optional(),
  /** Date range upper bound (ISO date YYYY-MM-DD). */
  to: z.string().date().optional(),
  /**
   * Keyset cursor: `<shift_date>|<uuid>`.
   * Encodes the last row of the previous page for ASC-ordered keyset pagination.
   */
  cursor: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}\|[0-9a-fA-F-]{32,36}$/, "Invalid cursor.")
    .optional(),
  pageSize: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]).optional(),
});

export type ShiftOverviewFilters = z.infer<typeof shiftOverviewFiltersSchema>;

export function encodeShiftCursor(shiftDate: string, id: string): string {
  return `${shiftDate}|${id}`;
}

export function decodeShiftCursor(
  cursor: string | undefined,
): { shiftDate: string; id: string } | null {
  if (!cursor) return null;
  const [shiftDate, id] = cursor.split("|");
  if (!shiftDate || !id) return null;
  return { shiftDate, id };
}
