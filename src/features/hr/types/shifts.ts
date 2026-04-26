/** Types for `/management/hr/shifts` — shift scheduling page. */

// ── Shift Types (shift dictionary) ─────────────────────────────────────

export type ShiftTypeRow = Readonly<{
  id: string;
  code: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakDurationMinutes: number;
  graceLateArrivalMinutes: number;
  graceEarlyDepartureMinutes: number;
  maxLateClockInMinutes: number;
  maxEarlyClockInMinutes: number;
  maxLateClockOutMinutes: number;
  color: string | null;
  isActive: boolean;
}>;

// ── Roster Templates ───────────────────────────────────────────────────

export type RosterTemplateRow = Readonly<{
  id: string;
  name: string;
  cycleLengthDays: number;
  anchorDate: string; // ISO date
  isActive: boolean;
  createdAt: string;
}>;

export type RosterTemplateShiftRow = Readonly<{
  id: string;
  templateId: string;
  dayIndex: number;
  shiftTypeId: string;
  shiftTypeName?: string;
}>;

// ── Staff Roster Assignments ───────────────────────────────────────────

export type StaffAssignmentRow = Readonly<{
  id: string;
  staffRecordId: string;
  staffName: string;
  rosterTemplateId: string;
  rosterTemplateName: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
}>;

// ── Schedule Overview ──────────────────────────────────────────────────

export type ScheduleOverviewRow = Readonly<{
  id: string;
  staffRecordId: string;
  staffName: string;
  shiftDate: string;
  shiftTypeName: string;
  expectedStartTime: string | null;
  expectedEndTime: string | null;
  isOverride: boolean;
  overrideReason: string | null;
}>;

export type ScheduleOverviewPage = Readonly<{
  rows: readonly ScheduleOverviewRow[];
  /** Cursor for the next page, or null when on the last page. */
  nextCursor: { shiftDate: string; id: string } | null;
  hasPrev: boolean;
  /** Total rows matching the active filters (no cursor restriction). */
  totalShifts: number;
  overridesCount: number;
}>;

// ── Public Holidays ────────────────────────────────────────────────────

export type PublicHolidayRow = Readonly<{
  id: string;
  holidayDate: string;
  name: string;
}>;

// ── Page-level data bundle ─────────────────────────────────────────────

export type ShiftPageData = Readonly<{
  shiftTypes: readonly ShiftTypeRow[];
  rosterTemplates: readonly RosterTemplateRow[];
  templateShifts: readonly RosterTemplateShiftRow[];
  staffAssignments: readonly StaffAssignmentRow[];
  holidays: readonly PublicHolidayRow[];
  /** Available staff for assignment dropdown */
  staffOptions: readonly { id: string; name: string }[];
}>;

// ── Pattern Preview (from rpc_preview_pattern_change) ──────────────────

export type PatternPreview = Readonly<{
  affected_staff_count: number;
  shifts_to_insert: number;
  shifts_to_update: number;
  stale_rest_day_rows: number;
  work_day_overrides: number;
}>;
