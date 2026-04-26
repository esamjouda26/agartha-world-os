import type { Database } from "@/types/database";

/**
 * Management HR discrepancy queue types.
 * Used by `/management/hr/attendance/queue`.
 */

export type ExceptionType = Database["public"]["Enums"]["exception_type"];
export type ExceptionStatus = Database["public"]["Enums"]["exception_status"];

/** Row shape for the discrepancy queue table. */
export type DiscrepancyQueueRow = Readonly<{
  id: string;
  shiftScheduleId: string;
  staffRecordId: string;
  staffName: string;
  shiftDate: string;
  shiftTime: string;
  type: ExceptionType;
  status: ExceptionStatus;
  detail: string | null;
  staffClarification: string | null;
  hrNote: string | null;
  punchRemark: string | null;
  clarificationSubmittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  attachmentCount: number;
}>;

/** KPI aggregates for the queue header bar. */
export type DiscrepancyQueueKpis = Readonly<{
  awaitingReview: number;
  oldestHoursAgo: number | null;
}>;

/** Full paginated data payload passed from RSC → client component. */
export type DiscrepancyQueueData = Readonly<{
  rows: readonly DiscrepancyQueueRow[];
  kpis: DiscrepancyQueueKpis;
  leaveTypes: readonly { id: string; name: string; code: string }[];
  /** Cursor for the next page, or null when on the last page. */
  nextCursor: { submittedAt: string; id: string } | null;
}>;
