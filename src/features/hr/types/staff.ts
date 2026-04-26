/**
 * Mapped view types for HR staff list and detail pages.
 * Derived from DB row types — never duplicates generated types.
 */

/** Staff list row — projected from staff_records + profiles + roles + org_units. */
export type StaffRow = Readonly<{
  id: string;
  displayName: string;
  employeeId: string | null;
  legalName: string;
  personalEmail: string | null;
  employmentStatus: string;
  roleName: string | null;
  roleId: string | null;
  orgUnitName: string | null;
  orgUnitId: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  createdAt: string;
}>;

/** KPI summary for the staff list page. */
export type StaffKpis = Readonly<{
  activeCount: number;
  onLeaveCount: number;
  pendingCount: number;
  expiringCount: number;
}>;

/** Aggregated data for the staff list page. */
export type StaffListData = Readonly<{
  staff: StaffRow[];
  kpis: StaffKpis;
}>;
