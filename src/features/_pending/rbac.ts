import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * TRANSITIONAL — routes that do not yet have a feature folder. Entries
 * migrate out of this file as each real feature is built in Phases 5–9
 * per ADR-0004. The `rbac:pending-empty` CI gate fails any merge to main
 * once Phase 9 completes if this array is non-empty.
 *
 * `primaryTables: []` here acknowledges that RLS-parity verification is
 * deferred until each feature lands its real `rbac.ts` with named tables.
 * The transitional empty array is explicitly allowed by the parity script
 * (with a WARNING printed) until the `_pending` sunset.
 *
 * DO NOT add new routes here. New features should scaffold their own
 * `src/features/<feature>/rbac.ts` directly.
 */
export const rbac: FeatureRbac = {
  featureId: "_pending",
  routes: [
    // ── Admin: IT persona ──
    { pattern: "/admin/iam{/*}?", domain: "hr", access: "c", primaryTables: [] },
    { pattern: "/admin/devices{/*}?", domain: "it", access: "c", primaryTables: [] },
    { pattern: "/admin/system-health{/*}?", domain: "it", access: "c", primaryTables: [] },
    { pattern: "/admin/zones{/*}?", domain: "system", access: "c", primaryTables: [] },
    { pattern: "/admin/org-units{/*}?", domain: "system", access: "c", primaryTables: [] },
    { pattern: "/admin/permissions{/*}?", domain: "system", access: "c", primaryTables: [] },
    { pattern: "/admin/units{/*}?", domain: "system", access: "c", primaryTables: [] },
    { pattern: "/admin/it{/*}?", domain: "it", access: "c", primaryTables: [] },

    // ── Admin: Business persona ──
    { pattern: "/admin/business{/*}?", domain: "booking", access: "r", primaryTables: [] },
    { pattern: "/admin/revenue{/*}?", domain: "booking", access: "r", primaryTables: [] },
    { pattern: "/admin/operations{/*}?", domain: "ops", access: "r", primaryTables: [] },
    { pattern: "/admin/costs{/*}?", domain: "inventory", access: "r", primaryTables: [] },
    { pattern: "/admin/guests{/*}?", domain: "reports", access: "r", primaryTables: [] },
    { pattern: "/admin/workforce{/*}?", domain: "hr", access: "r", primaryTables: [] },

    // ── Management: domain sections ──
    { pattern: "/management/hr{/*}?", domain: "hr", access: "c", primaryTables: [] },
    { pattern: "/management/pos/bom{/*}?", domain: "pos", access: "c", primaryTables: [] },
    { pattern: "/management/pos/price-lists{/*}?", domain: "pos", access: "c", primaryTables: [] },
    { pattern: "/management/pos{/*}?", domain: "pos", access: "c", primaryTables: [] },
    {
      pattern: "/management/procurement{/*}?",
      domain: "procurement",
      access: "c",
      primaryTables: [],
    },
    { pattern: "/management/inventory{/*}?", domain: "inventory", access: "c", primaryTables: [] },
    {
      pattern: "/management/operations/experiences{/*}?",
      domain: "booking",
      access: "c",
      primaryTables: [],
    },
    {
      pattern: "/management/operations/scheduler{/*}?",
      domain: "booking",
      access: "c",
      primaryTables: [],
    },
    { pattern: "/management/operations{/*}?", domain: "ops", access: "c", primaryTables: [] },
    {
      pattern: "/management/maintenance{/*}?",
      domain: "maintenance",
      access: "c",
      primaryTables: [],
    },
    { pattern: "/management/marketing{/*}?", domain: "marketing", access: "c", primaryTables: [] },

    // ── Crew: role-specific tabs ──
    { pattern: "/crew/pos{/*}?", domain: "pos", access: "c", primaryTables: [] },
    { pattern: "/crew/active-orders{/*}?", domain: "pos", access: "r", primaryTables: [] },
    { pattern: "/crew/entry-validation{/*}?", domain: "booking", access: "r", primaryTables: [] },
    { pattern: "/crew/restock{/*}?", domain: "inventory_ops", access: "c", primaryTables: [] },
    { pattern: "/crew/logistics{/*}?", domain: "inventory_ops", access: "c", primaryTables: [] },
    { pattern: "/crew/disposals{/*}?", domain: "inventory_ops", access: "c", primaryTables: [] },
    { pattern: "/crew/maintenance{/*}?", domain: "maintenance", access: "c", primaryTables: [] },
    // /crew/incidents is shared-bypass (see SHARED_BYPASS_PREFIXES in middleware-manifest.ts);
    // middleware skips Gate 5 for this path and RLS on `incidents` enforces row-level access.
  ],
} as const;
