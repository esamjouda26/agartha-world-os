import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for Reports. Admin + management only — crew have
 * no reports surface.
 */
export const nav: FeatureNav = {
  featureId: "reports",
  items: [
    {
      id: "admin-reports",
      portal: "admin",
      path: "/admin/reports",
      section: "shared",
      order: 50,
      iconName: "FileText",
      labelKey: "nav.admin.reports",
      label: "Reports",
      requires: { domain: "reports", access: "r" },
    },
    {
      id: "mgmt-reports",
      portal: "management",
      path: "/management/reports",
      section: "shared",
      order: 50,
      iconName: "FileText",
      labelKey: "nav.mgmt.reports",
      label: "Reports",
      requires: { domain: "reports", access: "r" },
    },
  ],
} as const;
