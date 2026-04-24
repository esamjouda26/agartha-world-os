import type { FeatureRbac } from "@/lib/rbac/types";

export const rbac: FeatureRbac = {
  featureId: "org-units",
  routes: [
    {
      pattern: "/admin/org-units",
      domain: "system",
      access: "c",
      primaryTables: ["org_units"],
    },
  ],
} as const;
