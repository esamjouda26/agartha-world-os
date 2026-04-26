import type { Database } from "@/types/database";

/**
 * Management HR leave management types.
 * Used by `/management/hr/attendance/leaves`.
 */

export type LeaveRequestStatus = Database["public"]["Enums"]["leave_request_status"];
export type LeaveTransactionType = Database["public"]["Enums"]["leave_transaction_type"];
export type AccrualFrequency = Database["public"]["Enums"]["accrual_frequency"];

/** Leave request row for the requests tab. */
export type LeaveRequestRow = Readonly<{
  id: string;
  staffRecordId: string;
  staffName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason: string | null;
  status: LeaveRequestStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}>;

/** Balance row from v_leave_balances. */
export type LeaveBalanceRow = Readonly<{
  staffRecordId: string;
  staffName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  isPaid: boolean;
  fiscalYear: number;
  accruedDays: number;
  carryForwardDays: number;
  usedDays: number;
  adjustmentDays: number;
  forfeitureDays: number;
  balance: number;
}>;

/** Ledger entry row for the history tab. */
export type LeaveLedgerRow = Readonly<{
  id: string;
  staffRecordId: string;
  staffName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  fiscalYear: number;
  transactionDate: string;
  transactionType: LeaveTransactionType;
  days: number;
  notes: string | null;
  createdAt: string;
}>;

/** Leave type row for the types tab. */
export type LeaveTypeRow = Readonly<{
  id: string;
  code: string;
  name: string;
  isPaid: boolean;
  isActive: boolean;
}>;

/** Leave policy row for the policies tab. */
export type LeavePolicyRow = Readonly<{
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  entitlements: readonly LeavePolicyEntitlementRow[];
}>;

/** Entitlement row within a policy. */
export type LeavePolicyEntitlementRow = Readonly<{
  leaveTypeId: string;
  leaveTypeName: string;
  daysPerYear: number;
  frequency: AccrualFrequency;
}>;

/** Full data payload passed from RSC → client component. */
export type LeaveManagementData = Readonly<{
  /** Paginated requests (cursor-based). */
  requestsPage: LeaveRequestPage;
  balances: readonly LeaveBalanceRow[];
  /** Paginated ledger history (cursor-based). */
  ledgerPage: LeaveLedgerPage;
  policies: readonly LeavePolicyRow[];
  leaveTypes: readonly LeaveTypeRow[];
  pendingCount: number;
  staffOptions: readonly { id: string; name: string }[];
}>;

/** Paginated page of leave requests. */
export type LeaveRequestPage = Readonly<{
  rows: readonly LeaveRequestRow[];
  nextCursor: { createdAt: string; id: string } | null;
}>;

/** Paginated page of leave ledger entries. */
export type LeaveLedgerPage = Readonly<{
  rows: readonly LeaveLedgerRow[];
  nextCursor: { createdAt: string; id: string } | null;
}>;
