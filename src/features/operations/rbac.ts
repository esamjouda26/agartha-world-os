import type { FeatureRbac } from "@/lib/rbac/types";

export const rbac: FeatureRbac = {
  featureId: "operations",
  routes: [
    {
      pattern: "/admin/operations",
      domain: "ops",
      access: "r",
      primaryTables: ["zone_telemetry", "zones", "incidents", "maintenance_orders"],
    },
  ],
} as const;
