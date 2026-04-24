import type { FeatureNav } from "@/lib/nav/types";

export const nav: FeatureNav = {
  featureId: "org-units",
  items: [
    {
      id: "admin-org-units",
      portal: "admin",
      path: "/admin/org-units",
      section: "system",
      order: 20,
      iconName: "GitBranch",
      labelKey: "nav.admin.orgUnits",
      label: "Org Units",
      requires: { domain: "system", access: "c" },
    },
  ],
} as const;
