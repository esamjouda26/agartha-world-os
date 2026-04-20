import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the Attendance feature. Consumed ONLY by the
 * nav aggregator (`src/lib/nav/manifest.ts`) and from there by portal
 * layouts + the command palette. Never imported from middleware.
 *
 * Shared route: visible on every staff portal (admin / management / crew)
 * under the "shared" section. No `requires` gate — RLS handles access.
 */
export const nav: FeatureNav = {
  featureId: "attendance",
  items: [
    {
      id: "admin-attendance",
      portal: "admin",
      path: "/admin/attendance",
      section: "shared",
      order: 40,
      iconName: "Clock",
      labelKey: "nav.admin.attendance",
      label: "Attendance",
      requires: { domain: "hr", access: "c" },
    },
    {
      id: "mgmt-attendance",
      portal: "management",
      path: "/management/attendance",
      section: "shared",
      order: 40,
      iconName: "Clock",
      labelKey: "nav.mgmt.attendance",
      label: "Attendance",
      requires: { domain: "hr", access: "c" },
    },
    {
      id: "crew-attendance",
      portal: "crew",
      path: "/crew/attendance",
      section: "shared",
      order: 10,
      iconName: "Clock",
      labelKey: "nav.crew.attendance",
      label: "Attendance",
      requires: { domain: "hr", access: "c" },
    },
  ],
} as const;
