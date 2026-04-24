import type { FeatureNav } from "@/lib/nav/types";

export const nav: FeatureNav = {
  featureId: "units",
  items: [
    {
      id: "admin-units",
      portal: "admin",
      path: "/admin/units",
      section: "system",
      order: 40,
      iconName: "Ruler",
      labelKey: "nav.admin.units",
      label: "Units of Measure",
      requires: { domain: "system", access: "c" },
    },
  ],
} as const;
