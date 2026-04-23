import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC for the Reports feature.
 *
 * Two surfaces:
 *   - `/admin/reports`        → Gate-5 `reports:r`
 *   - `/management/reports`   → Gate-5 `reports:r`
 *
 * `primaryTables: ["reports"]` — the `reports_select` RLS policy
 * ([init_schema.sql:3984-3985](../../../supabase/migrations/20260417064731_init_schema.sql#L3984))
 * gates SELECT on `reports:r`, matching the route requirement exactly.
 * The `rbac:rls-parity` CI gate confirms.
 */
export const rbac: FeatureRbac = {
  featureId: "reports",
  routes: [
    {
      pattern: "/admin/reports{/*}?",
      domain: "reports",
      access: "r",
      primaryTables: ["reports"],
    },
    {
      pattern: "/management/reports{/*}?",
      domain: "reports",
      access: "r",
      primaryTables: ["reports"],
    },
  ],
} as const;
