import type { FeatureNav } from "@/lib/nav/types";

export const nav: FeatureNav = {
  featureId: "zones",
  items: [
    {
      id: "admin-zones",
      portal: "admin",
      path: "/admin/zones",
      section: "system",
      order: 10,
      iconName: "MapPin",
      labelKey: "nav.admin.zones",
      label: "Zones & Locations",
      requires: { domain: "system", access: "c" },
    },
  ],
} as const;
