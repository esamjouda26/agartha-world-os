import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the IT Infrastructure feature.
 * Consumed ONLY by `src/lib/nav/manifest.ts`.
 *
 * IT-admin section: visible only to admins with `it:c`. Business admins
 * (who lack `it:c`) never see these items — they see the Business section
 * items from the executive feature instead.
 */
export const nav: FeatureNav = {
  featureId: "it",
  items: [
    {
      id: "admin-it-dashboard",
      portal: "admin",
      path: "/admin/it",
      section: "it",
      order: 10,
      iconName: "LayoutDashboard",
      labelKey: "nav.admin.itDashboard",
      label: "Dashboard",
      requires: { domain: "it", access: "c" },
    },
    {
      id: "admin-devices",
      portal: "admin",
      path: "/admin/devices",
      section: "it",
      order: 20,
      iconName: "HardDrive",
      labelKey: "nav.admin.devices",
      label: "Devices",
      requires: { domain: "it", access: "c" },
    },
    {
      id: "admin-system-health",
      portal: "admin",
      path: "/admin/system-health",
      section: "it",
      order: 30,
      iconName: "Activity",
      labelKey: "nav.admin.systemHealth",
      label: "System Health",
      requires: { domain: "it", access: "c" },
    },
  ],
} as const;
