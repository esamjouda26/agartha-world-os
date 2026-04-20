import { addMinutes, isAfter, isBefore, parseISO } from "date-fns";

import type { ClockButtonState, TodayShift } from "@/features/attendance/types";

/**
 * Button-state derivation per frontend_spec.md:4232 + WF-5 cutoff rules:
 *   - Before (expected_start_time + max_late_clock_in_minutes) AND no clock-in:
 *       → "clock-in"
 *   - After cutoff OR already clocked in, before clock-out cutoff:
 *       → "clock-out"
 *   - Both punches recorded:
 *       → "complete"
 *   - Outside permitted window entirely:
 *       → "outside-window"
 *
 * Pure function, unit-testable in isolation.
 */
export function deriveButtonState(now: Date, shift: TodayShift | null): ClockButtonState {
  if (!shift) return { kind: "no-shift" };

  const clockIn = shift.punches.find((p) => p.punch_type === "clock_in");
  const clockOut = shift.punches.find((p) => p.punch_type === "clock_out");

  if (clockIn && clockOut) {
    return { kind: "complete", clockInAt: clockIn.punch_time, clockOutAt: clockOut.punch_time };
  }

  const { schedule, shiftType } = shift;
  if (!schedule.expected_start_time || !schedule.expected_end_time) {
    return { kind: "no-shift" };
  }

  const startAt = combine(schedule.shift_date, schedule.expected_start_time);
  const endAt = combine(schedule.shift_date, schedule.expected_end_time);
  const earliestIn = addMinutes(startAt, -shiftType.max_early_clock_in_minutes);
  const latestIn = addMinutes(startAt, shiftType.max_late_clock_in_minutes);
  const latestOut = addMinutes(endAt, shiftType.max_late_clock_out_minutes);

  if (clockIn && !clockOut) {
    if (isAfter(now, latestOut)) return { kind: "outside-window", reason: "too-late" };
    return {
      kind: "clock-out",
      expectedEnd: endAt.toISOString(),
      cutoffAt: latestOut.toISOString(),
    };
  }

  // No clock-in yet
  if (isBefore(now, earliestIn)) return { kind: "outside-window", reason: "too-early" };
  if (isAfter(now, latestIn)) {
    // Clock-in window closed. Per WF-5, after cutoff we switch to clock-out
    // so the staffer can still record their departure even if they missed
    // the start (the missing_clock_in exception fires automatically).
    if (isAfter(now, latestOut)) return { kind: "outside-window", reason: "too-late" };
    return {
      kind: "clock-out",
      expectedEnd: endAt.toISOString(),
      cutoffAt: latestOut.toISOString(),
    };
  }

  return {
    kind: "clock-in",
    enabledAt: earliestIn.toISOString(),
    cutoffAt: latestIn.toISOString(),
  };
}

function combine(dateIso: string, timeIso: string): Date {
  const date = parseISO(dateIso);
  const [h, m, s] = timeIso.split(":").map(Number);
  date.setHours(h ?? 0, m ?? 0, s ?? 0, 0);
  return date;
}
