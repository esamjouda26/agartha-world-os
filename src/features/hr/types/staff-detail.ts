/**
 * Mapped view types for the staff detail page (/management/hr/[id]).
 */

/** Profile tab data. */
export type StaffProfile = Readonly<{
  id: string;
  legalName: string;
  displayName: string | null;
  employeeId: string | null;
  personalEmail: string | null;
  businessEmail: string | null;
  phone: string | null;
  address: string | null;
  employmentStatus: string;
  roleName: string | null;
  roleId: string | null;
  orgUnitName: string | null;
  orgUnitId: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  kinName: string | null;
  kinRelationship: string | null;
  kinPhone: string | null;
  createdAt: string;
}>;

/** Leave balance summary row (from v_leave_balances). */
export type LeaveBalanceRow = Readonly<{
  leaveTypeName: string;
  accrued: number;
  carried: number;
  adjusted: number;
  used: number;
  forfeited: number;
  balance: number;
}>;

/** Equipment assignment row. */
export type EquipmentRow = Readonly<{
  id: string;
  materialName: string;
  serialNumber: string | null;
  assignedAt: string;
  returnedAt: string | null;
}>;

/** Attendance summary for profile tab. */
export type AttendanceSummary = Readonly<{
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  openExceptions: number;
}>;

/** Aggregated data for the staff detail page. */
export type StaffDetailData = Readonly<{
  profile: StaffProfile;
  leaveBalances: LeaveBalanceRow[];
  equipmentAssignments: EquipmentRow[];
  attendanceSummary: AttendanceSummary;
  leavePolicyId: string | null;
  leavePolicyName: string | null;
  availableLeavePolicies: ReadonlyArray<{ id: string; name: string }>;
  availableRoles: ReadonlyArray<{ id: string; displayName: string }>;
}>;
