import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * Staffing RBAC — `/management/staffing` only.
 *
 * Gate-5 on `reports:r` because it's the single domain every manager
 * role holds and no crew role holds (confirmed across all seed grants
 * at [init_schema.sql:775-869](../../../supabase/migrations/20260417064731_init_schema.sql#L775)).
 * "Managers + admins only" expressed as a domain gate, no
 * `access_level` discriminator.
 *
 * `primaryTables: []` — the data path goes through
 * `rpc_get_active_staff()` which is SECURITY DEFINER and does its own
 * AuthZ check. The `shift_schedules` / `timecard_punches` tables the
 * RPC reads are still `hr:r`-gated at the RLS layer, so declaring
 * them here would trip the `rbac:rls-parity` CI gate with an
 * accurate but unhelpful "drift" error. Empty `primaryTables` tells
 * that gate the surface is RPC-mediated on purpose.
 */
export const rbac: FeatureRbac = {
  featureId: "staffing",
  routes: [
    {
      pattern: "/management/staffing{/*}?",
      domain: "reports",
      access: "r",
      primaryTables: [],
    },
  ],
} as const;
