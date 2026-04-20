import { describe, expect, it } from "vitest";

import { deriveButtonState } from "@/features/attendance/components/derive-button-state";
import type { TodayShift } from "@/features/attendance/types";

const shiftType: TodayShift["shiftType"] = {
  id: "type-1",
  code: "MORN",
  name: "Morning",
  start_time: "09:00:00",
  end_time: "17:00:00",
  grace_late_arrival_minutes: 5,
  grace_early_departure_minutes: 5,
  max_early_clock_in_minutes: 30,
  max_late_clock_in_minutes: 60,
  max_late_clock_out_minutes: 60,
};

function makeShift(punches: TodayShift["punches"]): TodayShift {
  return {
    schedule: {
      id: "sched-1",
      shift_date: "2026-04-20",
      shift_type_id: "type-1",
      expected_start_time: "09:00:00",
      expected_end_time: "17:00:00",
      is_override: false,
      override_reason: null,
    },
    shiftType,
    punches,
  };
}

describe("deriveButtonState", () => {
  it("returns no-shift when shift is null", () => {
    expect(deriveButtonState(new Date(), null)).toEqual({ kind: "no-shift" });
  });

  it("returns outside-window:too-early before the earliest clock-in window", () => {
    // Local 04:00 on shift_date is well before (09:00 − 30min).
    const result = deriveButtonState(new Date(2026, 3, 20, 4, 0, 0), makeShift([]));
    expect(result.kind).toBe("outside-window");
    if (result.kind === "outside-window") expect(result.reason).toBe("too-early");
  });

  it("returns clock-in within the open window with no punches", () => {
    // Build local "08:45" relative to shift_date so the expectation holds
    // regardless of the TZ the test runs in.
    const clockDate = new Date(2026, 3, 20, 8, 45, 0);
    const result = deriveButtonState(clockDate, makeShift([]));
    expect(result.kind).toBe("clock-in");
  });

  it("returns clock-out after clock-in has been recorded", () => {
    const now = new Date(2026, 3, 20, 12, 0, 0);
    const result = deriveButtonState(
      now,
      makeShift([
        {
          id: "p1",
          punch_type: "clock_in",
          punch_time: "2026-04-20T09:01:00Z",
          source: "mobile",
          remark: null,
        },
      ]),
    );
    expect(result.kind).toBe("clock-out");
  });

  it("returns complete when both punches exist", () => {
    const result = deriveButtonState(
      new Date(2026, 3, 20, 18, 0, 0),
      makeShift([
        {
          id: "p1",
          punch_type: "clock_in",
          punch_time: "2026-04-20T09:01:00Z",
          source: "mobile",
          remark: null,
        },
        {
          id: "p2",
          punch_type: "clock_out",
          punch_time: "2026-04-20T17:10:00Z",
          source: "mobile",
          remark: null,
        },
      ]),
    );
    expect(result.kind).toBe("complete");
  });

  it("returns outside-window:too-late well past the clock-out cutoff", () => {
    const result = deriveButtonState(
      new Date(2026, 3, 20, 23, 0, 0),
      makeShift([
        {
          id: "p1",
          punch_type: "clock_in",
          punch_time: "2026-04-20T09:01:00Z",
          source: "mobile",
          remark: null,
        },
      ]),
    );
    expect(result.kind).toBe("outside-window");
  });
});
