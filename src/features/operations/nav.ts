import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the Operations feature — ADR-0004.
 *
 * /crew/zone-scan is a shared crew route (no domain gate) — RLS enforces access.
 * /admin/operations is gated via operations/rbac.ts.
 *
 * NOTE: Experience Config and Scheduler require `booking:c`, not `ops:c`.
 * Both domains are under `/operations` because operations_manager owns
 * both `ops` and `booking` domains.
 */
export const nav: FeatureNav = {
  featureId: "operations",
  items: [
    {
      id: "crew-zone-scan",
      portal: "crew",
      path: "/crew/zone-scan",
      section: "shared",
      order: 50,
      iconName: "QrCode",
      labelKey: "nav.crew.zoneScan",
      label: "Zone Scan",
    },
    {
      id: "management-ops-telemetry",
      portal: "management",
      path: "/management/operations/telemetry",
      section: "domains",
      order: 301,
      iconName: "Activity",
      labelKey: "nav.mgmt.ops.telemetry",
      label: "Zone Telemetry",
      requires: { 
        domain: "ops", 
        access: "r",
        additionalDomains: [
          { domain: "ops", access: "c" },
          { domain: "ops", access: "u" }
        ]
      },
    },
    {
      id: "management-ops-experiences",
      portal: "management",
      path: "/management/operations/experiences",
      section: "domains",
      order: 302,
      iconName: "Tags",
      labelKey: "nav.mgmt.ops.experiences",
      label: "Experience Config",
      requires: { domain: "booking", access: "c" },
    },
    {
      id: "management-ops-scheduler",
      portal: "management",
      path: "/management/operations/scheduler",
      section: "domains",
      order: 303,
      iconName: "CalendarClock",
      labelKey: "nav.mgmt.ops.scheduler",
      label: "Operational Timeline",
      requires: { domain: "booking", access: "c" },
    },
    {
      id: "management-ops-vehicles",
      portal: "management",
      path: "/management/operations/vehicles",
      section: "domains",
      order: 304,
      iconName: "Truck",
      labelKey: "nav.mgmt.ops.vehicles",
      label: "Vehicle Fleet",
      requires: { domain: "ops", access: "c" },
    },
  ],
} as const;
