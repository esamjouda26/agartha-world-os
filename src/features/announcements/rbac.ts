import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC for the Announcements feature.
 *
 * The sidebar route `/admin/announcements` + `/management/announcements`
 * is management-only (requires `comms:c`). Crew never sees a route entry —
 * they read announcements via the topbar bell only, which goes through
 * `get_visible_announcements()` (SECURITY DEFINER, no domain gate).
 *
 * Gate 5 patterns match both portals. `primaryTables` lists `announcements`
 * (the first table a write touches). `rbac:rls-parity` CI gate asserts
 * that table has `CREATE POLICY … INSERT … (domains->>'comms') ? 'c'`.
 */
export const rbac: FeatureRbac = {
  featureId: "announcements",
  routes: [
    {
      pattern: "/admin/announcements{/*}?",
      domain: "comms",
      access: "c",
      primaryTables: ["announcements"],
    },
    {
      pattern: "/management/announcements{/*}?",
      domain: "comms",
      access: "c",
      primaryTables: ["announcements"],
    },
  ],
} as const;
