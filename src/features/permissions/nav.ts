import type { FeatureNav } from "@/lib/nav/types";

export const nav: FeatureNav = {
  featureId: "permissions",
  items: [
    {
      id: "admin-permissions",
      portal: "admin",
      path: "/admin/permissions",
      section: "system",
      order: 30,
      iconName: "ShieldCheck",
      labelKey: "nav.admin.permissions",
      label: "Permissions",
      requires: { domain: "system", access: "c" },
    },
  ],
} as const;
