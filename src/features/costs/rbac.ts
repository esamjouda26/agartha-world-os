import type { FeatureRbac } from "@/lib/rbac/types";

export const rbac: FeatureRbac = {
  featureId: "costs",
  routes: [
    {
      pattern: "/admin/costs",
      domain: "inventory",
      access: "r",
      primaryTables: ["stock_balance_cache", "write_offs", "goods_movement_items"],
    },
  ],
} as const;
