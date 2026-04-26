import type { Database } from "@/types/database";

/**
 * Management HR attendance ledger types — narrow views over generated DB types.
 * Used by `/management/hr/attendance/ledger`.
 */

export type ShiftAttendanceViewRow = Database["public"]["Views"]["v_shift_attendance"]["Row"];

/** Row shape for the attendance ledger table (view + joined display names). */
export type AttendanceLedgerRow = Readonly<{
  shiftScheduleId: string;
  staffRecordId: string;
  staffName: string;
  orgUnitName: string | null;
  shiftDate: string;
  shiftCode: string | null;
  shiftName: string | null;
  expectedStartTime: string | null;
  expectedEndTime: string | null;
  isOverride: boolean;
  overrideReason: string | null;
  firstIn: string | null;
  lastOut: string | null;
  grossWorkedSeconds: number | null;
  netWorkedSeconds: number | null;
  expectedNetSeconds: number | null;
  derivedStatus: string | null;
  exceptionTypes: string | null;
  hasUnjustified: boolean | null;
  leaveTypeName: string | null;
  publicHolidayName: string | null;
}>;

/** KPI aggregates for the selected date range. */
export type AttendanceLedgerKpis = Readonly<{
  scheduled: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
}>;

/**
 * Paginated data payload — mirrors AuditLogPage pattern.
 * Server-side cursor pagination + server-side filtering.
 */
export type AttendanceLedgerPage = Readonly<{
  /** Current page of rows (pre-filtered by the server). */
  rows: readonly AttendanceLedgerRow[];
  /** KPIs for the FULL date range (not just the current page). */
  kpis: AttendanceLedgerKpis;
  /** Cursor for the next page, or null if this is the last page. */
  nextCursor: { shiftDate: string; shiftScheduleId: string } | null;
  /** Reflects whether a cursor was supplied (i.e. we're NOT on page 1). */
  hasPrev: boolean;
  /** Available org units for filter dropdown (full list, not page-scoped). */
  orgUnits: readonly { id: string; name: string }[];
  /** Available shift types for filter dropdown. */
  shiftTypes: readonly { id: string; name: string; code: string }[];
}>;
