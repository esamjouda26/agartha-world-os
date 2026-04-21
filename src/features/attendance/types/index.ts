import type { Database } from "@/types/database";

/**
 * Attendance domain types — narrow views over the generated `Database` types.
 * No hand-authored shapes; every row projection is derived from the source of
 * truth ([src/types/database.ts](src/types/database.ts)).
 */

export type ShiftSchedule = Database["public"]["Tables"]["shift_schedules"]["Row"];
export type ShiftType = Database["public"]["Tables"]["shift_types"]["Row"];
export type TimecardPunch = Database["public"]["Tables"]["timecard_punches"]["Row"];
export type AttendanceException = Database["public"]["Tables"]["attendance_exceptions"]["Row"];
export type ShiftAttendanceRow = Database["public"]["Views"]["v_shift_attendance"]["Row"];

export type PunchType = Database["public"]["Enums"]["punch_type"];
export type PunchSource = Database["public"]["Enums"]["punch_source"];
export type ExceptionStatus = Database["public"]["Enums"]["exception_status"];
export type ExceptionType = Database["public"]["Enums"]["exception_type"];

/**
 * Tab-1 payload — the RSC query composes a shift schedule, its shift_type
 * metadata, and every non-voided punch for the day. Shape is serializable
 * over the RSC → Client boundary (ISO strings, plain JSON).
 */
export type TodayShift = Readonly<{
  schedule: Pick<
    ShiftSchedule,
    | "id"
    | "shift_date"
    | "shift_type_id"
    | "expected_start_time"
    | "expected_end_time"
    | "is_override"
    | "override_reason"
  >;
  shiftType: Pick<
    ShiftType,
    | "id"
    | "code"
    | "name"
    | "start_time"
    | "end_time"
    | "grace_late_arrival_minutes"
    | "grace_early_departure_minutes"
    | "max_early_clock_in_minutes"
    | "max_late_clock_in_minutes"
    | "max_late_clock_out_minutes"
  >;
  punches: ReadonlyArray<
    Pick<TimecardPunch, "id" | "punch_type" | "punch_time" | "source" | "remark">
  >;
}>;

/**
 * Attachment record surfaced to the crew tab + HR queue alongside its
 * parent exception.
 */
export type ExceptionAttachment = Readonly<{
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}>;

/**
 * Tab-2 payload — exception joined with shift schedule + shift_type for
 * human-readable context. Read-only from the client's point of view.
 *
 * Four-state model per ADR-0007:
 *   unjustified     — auto-created, awaiting staff action or HR unilateral
 *   pending_review  — staff submitted clarification; awaiting HR decision
 *   justified       — HR approved (hr_note holds the justification)
 *   rejected        — HR rejected (hr_note holds the reason; staff may resubmit)
 */
export type ExceptionRow = Readonly<{
  id: string;
  shift_date: string;
  shift_type_name: string | null;
  shift_type_code: string | null;
  type: ExceptionType;
  status: ExceptionStatus;
  detail: string | null;
  punch_remark: string | null;
  staff_clarification: string | null;
  hr_note: string | null;
  clarification_submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  attachments: ReadonlyArray<ExceptionAttachment>;
}>;

/** Tab-3 monthly aggregate — derived from `v_shift_attendance`. */
export type MonthlyStats = Readonly<{
  month_start: string;
  month_end: string;
  days_worked: number;
  days_absent: number;
  days_on_leave: number;
  gross_hours: number;
  net_hours: number;
  late_minutes: number;
  early_departure_minutes: number;
  unjustified_exception_count: number;
  weekly_breakdown: ReadonlyArray<WeeklyBreakdownRow>;
}>;

export type WeeklyBreakdownRow = Readonly<{
  week_start: string;
  week_end: string;
  days_worked: number;
  gross_hours: number;
  late_minutes: number;
}>;

/**
 * Tab-1 button state — computed from shift window + punch history.
 * Enum covers every UI branch so the component cannot regress into undefined
 * affordances; `assertNever` catches missed cases at compile time.
 */
export type ClockButtonState =
  | { kind: "clock-in"; enabledAt: string; cutoffAt: string }
  | { kind: "clock-out"; expectedEnd: string; cutoffAt: string }
  | { kind: "complete"; clockInAt: string; clockOutAt: string }
  | { kind: "no-shift" }
  | { kind: "outside-window"; reason: "too-early" | "too-late" };
