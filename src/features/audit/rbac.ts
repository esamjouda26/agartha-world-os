import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * Audit feature RBAC.
 *
 * `/admin/audit` + `/management/audit` both Gate-5 on `reports:r` —
 * matching the `system_audit_log_select` RLS policy
 * ([init_schema.sql:4006-4007](../../../supabase/migrations/20260417064731_init_schema.sql#L4006)).
 * The `rbac:rls-parity` CI gate confirms the pair.
 */
export const rbac: FeatureRbac = {
  featureId: "audit",
  routes: [
    {
      pattern: "/admin/audit{/*}?",
      domain: "reports",
      access: "r",
      primaryTables: ["system_audit_log"],
    },
    {
      pattern: "/management/audit{/*}?",
      domain: "reports",
      access: "r",
      primaryTables: ["system_audit_log"],
    },
  ],
} as const;
