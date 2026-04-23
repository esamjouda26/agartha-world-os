import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for Audit. Admin + management only — crew have
 * no audit surface.
 */
export const nav: FeatureNav = {
  featureId: "audit",
  items: [
    {
      id: "admin-audit",
      portal: "admin",
      path: "/admin/audit",
      section: "shared",
      order: 55,
      iconName: "ScrollText",
      labelKey: "nav.admin.audit",
      label: "Audit log",
      requires: { domain: "reports", access: "r" },
    },
    {
      id: "mgmt-audit",
      portal: "management",
      path: "/management/audit",
      section: "shared",
      order: 55,
      iconName: "ScrollText",
      labelKey: "nav.mgmt.audit",
      label: "Audit log",
      requires: { domain: "reports", access: "r" },
    },
  ],
} as const;
