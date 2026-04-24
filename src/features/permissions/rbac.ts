import type { FeatureRbac } from "@/lib/rbac/types";

export const rbac: FeatureRbac = {
  featureId: "permissions",
  routes: [
    {
      pattern: "/admin/permissions",
      domain: "system",
      access: "c",
      primaryTables: ["roles", "permission_domains", "role_domain_permissions"],
    },
  ],
} as const;
