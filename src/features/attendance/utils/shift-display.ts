import { format } from "date-fns";

import { parseIsoDateLocal } from "@/lib/date";
import type { TodayShift } from "@/features/attendance/types";

/**
 * Shared display helpers for shift metadata. The seed stores
 * `shift_types.name` with an embedded time window
 * (e.g. "Morning (09:00–17:00)"), which duplicates the formatted
 * `expected_start_time`/`expected_end_time` we render separately.
 * Every user-facing surface should route through these helpers so the
 * duplication is fixed once, not on every touch point.
 */

const TIME_WINDOW_RE = /\s*\((?:\d{1,2}:\d{2}[–-]\d{1,2}:\d{2}[^)]*)\)\s*$/;

/** Return the shift name with the trailing "(HH:MM–HH:MM)" window removed. */
export function displayShiftName(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(TIME_WINDOW_RE, "").trim();
}

/** Format a shift's expected window as "9:00 AM – 5:00 PM". Null when the
 *  schedule didn't snapshot the times (should never happen for ongoing
 *  shifts; the placeholder keeps the UI layout stable). */
export function displayShiftWindow(shift: TodayShift): string | null {
  const { schedule } = shift;
  if (!schedule.expected_start_time || !schedule.expected_end_time) return null;
  const start = combine(schedule.shift_date, schedule.expected_start_time);
  const end = combine(schedule.shift_date, schedule.expected_end_time);
  return `${format(start, "p")} – ${format(end, "p")}`;
}

function combine(dateIso: string, timeIso: string): Date {
  // Local midnight + `setHours` → correct calendar day in every tz.
  // See `src/lib/date.ts` for the UTC-vs-local round-trip rationale.
  const date = parseIsoDateLocal(dateIso);
  const [h, m, s] = timeIso.split(":").map(Number);
  date.setHours(h ?? 0, m ?? 0, s ?? 0, 0);
  return date;
}
