import type { FeatureNav } from "@/lib/nav/types";

export const nav: FeatureNav = {
  featureId: "booking",
  items: [
    {
      id: "crew-entry-validation",
      portal: "crew",
      path: "/crew/entry-validation",
      section: "role",
      order: 30,
      iconName: "ScanLine",
      labelKey: "nav.crew.entryValidation",
      label: "Entry",
      requires: { domain: "booking", access: "r" },
    },
  ],
} as const;
