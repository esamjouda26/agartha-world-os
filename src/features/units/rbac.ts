import type { FeatureRbac } from "@/lib/rbac/types";

export const rbac: FeatureRbac = {
  featureId: "units",
  routes: [
    {
      pattern: "/admin/units",
      domain: "system",
      access: "c",
      primaryTables: ["units"],
    },
  ],
} as const;
