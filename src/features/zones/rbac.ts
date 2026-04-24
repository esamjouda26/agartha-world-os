import type { FeatureRbac } from "@/lib/rbac/types";

export const rbac: FeatureRbac = {
  featureId: "zones",
  routes: [
    {
      pattern: "/admin/zones",
      domain: "system",
      access: "c",
      primaryTables: ["locations", "zones", "location_allowed_categories"],
    },
  ],
} as const;
