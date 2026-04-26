import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the HR feature — ADR-0004.
 *
 * All management/hr routes are domain-gated (`hr`). Deep-link detail
 * routes (`/management/hr/:id`) live here but NOT in `nav.ts`.
 * Attendance sub-routes under `/management/hr/attendance/*` also
 * declared here because they share the `hr` domain gate even though
 * their queries/actions live in the `attendance` and `leave` feature
 * modules.
 */
export const rbac: FeatureRbac = {
  featureId: "hr",
  routes: [
    {
      pattern: "/management/hr",
      domain: "hr",
      access: "c",
      primaryTables: ["staff_records"],
    },
    {
      pattern: "/management/hr/:id",
      domain: "hr",
      access: "c",
      primaryTables: ["staff_records"],
    },
    {
      pattern: "/management/hr/shifts",
      domain: "hr",
      access: "c",
      primaryTables: ["shift_schedules"],
    },
    {
      pattern: "/management/hr/attendance/ledger",
      domain: "hr",
      access: "r",
      primaryTables: ["shift_schedules"],
    },
    {
      pattern: "/management/hr/attendance/leaves",
      domain: "hr",
      access: "c",
      primaryTables: ["leave_requests"],
    },
    {
      pattern: "/management/hr/attendance/queue",
      domain: "hr",
      access: "r",
      primaryTables: ["attendance_exceptions"],
    },
  ],
} as const;
