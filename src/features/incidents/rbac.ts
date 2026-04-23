import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * Incidents feature RBAC.
 *
 * Three surfaces:
 *   - `/management/operations/incidents`  → Gate-5 `ops:c`
 *   - `/management/maintenance/incidents` → Gate-5 `ops:r`
 *   - `/crew/incidents`                    → shared-bypass (Tier-2
 *     universal insert on `incidents`). Handled in
 *     `SHARED_BYPASS_PREFIXES`; no entry here.
 *
 * `primaryTables: []` is deliberate and non-trivial. The `incidents`
 * table is Tier-2 by design
 * ([init_schema.sql:3534-3542](../../../supabase/migrations/20260417064731_init_schema.sql#L3534)):
 *   - `incidents_select` — universal read for any authenticated user
 *     (only `is_claims_fresh()`).
 *   - `incidents_insert` — universal insert for any authenticated user.
 *   - `incidents_update` — gated on `ops:u`.
 *   - `incidents_delete` — gated on `ops:d`.
 *
 * The routes here gate access at a HIGHER level than the table:
 *   - Crew can read + write ANY incident at the RLS layer; the route
 *     gate (shared-bypass) + the page-level query filter (`created_by =
 *     auth.uid()` for crew) narrow the UI to "own incidents only".
 *   - Managers need `ops:c` / `ops:r` at the route layer for the
 *     listing/reporting UI, then `ops:u` is enforced *per-action* in
 *     `resolveIncidentAction` (which matches the RLS policy).
 *
 * This is the "Flag as intentional" case in `scripts/rbac-rls-parity.ts`:
 * the route's UI gate is stricter than the table's RLS on purpose. Empty
 * `primaryTables` signals the parity check to skip the table-level match.
 */
export const rbac: FeatureRbac = {
  featureId: "incidents",
  routes: [
    {
      pattern: "/management/operations/incidents{/*}?",
      domain: "ops",
      access: "c",
      primaryTables: [],
    },
    {
      pattern: "/management/maintenance/incidents{/*}?",
      domain: "maintenance",
      access: "r",
      primaryTables: [],
    },
  ],
} as const;
