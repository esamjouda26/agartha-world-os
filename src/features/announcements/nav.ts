import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for Announcements.
 *
 * Admin + management users with `comms:c` see the sidebar/bottom-tab
 * entry for managing announcements. Crew do NOT — they read via the
 * topbar bell only; no sidebar entry for reading.
 *
 * `requires: comms:c` matches rbac.ts so the Gate 5 domain check and
 * the nav filter both use the same threshold.
 */
export const nav: FeatureNav = {
  featureId: "announcements",
  items: [
    {
      id: "admin-announcements",
      portal: "admin",
      path: "/admin/announcements",
      section: "shared",
      order: 60,
      iconName: "Megaphone",
      labelKey: "nav.admin.announcements",
      label: "Announcements",
      requires: { domain: "comms", access: "c" },
    },
    {
      id: "mgmt-announcements",
      portal: "management",
      path: "/management/announcements",
      section: "shared",
      order: 60,
      iconName: "Megaphone",
      labelKey: "nav.mgmt.announcements",
      label: "Announcements",
      requires: { domain: "comms", access: "c" },
    },
  ],
} as const;
