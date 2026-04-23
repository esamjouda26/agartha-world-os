/**
 * Authoritative list of every `report_type` the `execute_report` PL/pgSQL
 * dispatcher accepts
 * ([init_schema.sql:6786-6818](../../../supabase/migrations/20260417064731_init_schema.sql#L6786)).
 *
 * Kept as a literal tuple so Zod can narrow `z.enum(REPORT_TYPES)` to the
 * `ReportType` union. Adding a new report to Postgres MUST add the same
 * string here — CI doesn't enforce this mirror (the dispatcher is a
 * CASE block, not a PG enum type) so review discipline substitutes.
 */
export const REPORT_TYPES = [
  // HR
  "monthly_attendance_summary",
  "monthly_timesheet",
  "leave_balance",
  "leave_usage",
  "staff_roster",
  "exception_report",
  // POS
  "daily_sales",
  "sales_by_item",
  "sales_by_category",
  "sales_by_payment_method",
  "hourly_sales",
  // Procurement
  "purchase_order_summary",
  // Inventory
  "stock_level",
  "low_stock_alert",
  "waste_report",
  "inventory_movement",
  "reconciliation_report",
  // Booking + Ops
  "booking_summary",
  "booking_occupancy",
  "revenue_by_experience",
  "incident_summary",
  "vehicle_status",
  // Marketing
  "guest_satisfaction",
  "nps_summary",
  // Maintenance
  "maintenance_summary",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

/**
 * Display copy for each `report_type`. Values mirror how a facility
 * manager would describe the report verbally.
 */
export const REPORT_LABEL: Readonly<Record<ReportType, string>> = {
  monthly_attendance_summary: "Monthly attendance summary",
  monthly_timesheet: "Monthly timesheet",
  leave_balance: "Leave balance",
  leave_usage: "Leave usage",
  staff_roster: "Staff roster",
  exception_report: "Attendance exceptions",
  daily_sales: "Daily sales",
  sales_by_item: "Sales by item",
  sales_by_category: "Sales by category",
  sales_by_payment_method: "Sales by payment method",
  hourly_sales: "Hourly sales",
  purchase_order_summary: "Purchase order summary",
  stock_level: "Stock level",
  low_stock_alert: "Low stock alert",
  waste_report: "Waste report",
  inventory_movement: "Inventory movement",
  reconciliation_report: "Reconciliation report",
  booking_summary: "Booking summary",
  booking_occupancy: "Booking occupancy",
  revenue_by_experience: "Revenue by experience",
  incident_summary: "Incident summary",
  vehicle_status: "Vehicle status",
  guest_satisfaction: "Guest satisfaction",
  nps_summary: "NPS summary",
  maintenance_summary: "Maintenance summary",
};

/**
 * Domain-to-report ownership. A user sees a report type if they hold
 * ANY access level on at least one of the report's owning domains
 * (spec §6 · DomainReportsPage / line 4214). Admins with `system:r`
 * bypass the filter and see everything.
 */
export const REPORT_DOMAINS: Readonly<Record<ReportType, readonly string[]>> = {
  monthly_attendance_summary: ["hr"],
  monthly_timesheet: ["hr"],
  leave_balance: ["hr"],
  leave_usage: ["hr"],
  staff_roster: ["hr"],
  exception_report: ["hr"],
  daily_sales: ["pos"],
  sales_by_item: ["pos"],
  sales_by_category: ["pos"],
  sales_by_payment_method: ["pos"],
  hourly_sales: ["pos"],
  purchase_order_summary: ["procurement"],
  stock_level: ["inventory", "inventory_ops"],
  low_stock_alert: ["inventory", "inventory_ops"],
  waste_report: ["inventory", "inventory_ops"],
  inventory_movement: ["inventory", "inventory_ops"],
  reconciliation_report: ["inventory", "inventory_ops"],
  booking_summary: ["booking", "ops"],
  booking_occupancy: ["booking", "ops"],
  revenue_by_experience: ["booking", "ops"],
  incident_summary: ["booking", "ops"],
  vehicle_status: ["booking", "ops"],
  guest_satisfaction: ["marketing"],
  nps_summary: ["marketing"],
  maintenance_summary: ["maintenance"],
};

export const DATE_RANGE_PRESETS = ["today", "last_7_days", "last_30_days", "custom"] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_LABEL: Readonly<Record<DateRangePreset, string>> = {
  today: "Today",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  custom: "Custom range",
};
