/**
 * Route manifest — middleware-side RBAC map derived from
 * frontend_spec.md §8 (Sidebar Configuration Reference).
 *
 * Each entry pairs a portal path prefix with the `requiredDomain` and
 * minimum access tier the caller's JWT `app_metadata.domains` must
 * carry to enter. Gate 5 of the middleware decision tree consults this
 * table; shared routes (settings / attendance / announcements /
 * reports / audit) intentionally carry no entry — they fall through
 * the gate and rely on RLS + page-level filtering.
 *
 * This manifest is referenced by `middleware.ts` only. Page-level
 * checks (sidebar rendering, command-palette filtering, etc.) consume
 * the same data but are not coupled to middleware semantics.
 */

export type DomainAccess = "c" | "r" | "u" | "d";

export type RouteRequirement = Readonly<{
  /** Path prefix (no locale). Matched with `startsWith`. */
  prefix: string;
  /** Domain code present in JWT `domains` claim. */
  domain: string;
  /** Minimum access level required on that domain. */
  access: DomainAccess;
}>;

// NOTE: Gate 6 (MFA) is deferred — `mfa_verified` does not exist in the
// current JWT `app_metadata` shape emitted by `handle_profile_role_change`
// (init_schema.sql:497-507). See `docs/adr/0002-defer-mfa-gate.md` for the
// tracking decision and the migration that would re-introduce it.

/**
 * Ordered longest-prefix-first so that `/admin/iam/[id]` resolves
 * before `/admin/iam`. The `find` lookup in middleware relies on
 * this ordering.
 */
export const ROUTE_MANIFEST: readonly RouteRequirement[] = [
  // ── Admin: IT ──
  { prefix: "/admin/iam", domain: "hr", access: "c" },
  { prefix: "/admin/devices", domain: "it", access: "c" },
  { prefix: "/admin/system-health", domain: "it", access: "c" },
  { prefix: "/admin/zones", domain: "system", access: "c" },
  { prefix: "/admin/org-units", domain: "system", access: "c" },
  { prefix: "/admin/permissions", domain: "system", access: "c" },
  { prefix: "/admin/units", domain: "system", access: "c" },
  { prefix: "/admin/it", domain: "it", access: "c" },
  // ── Admin: Business ──
  { prefix: "/admin/business", domain: "booking", access: "r" },
  { prefix: "/admin/revenue", domain: "booking", access: "r" },
  { prefix: "/admin/operations", domain: "ops", access: "r" },
  { prefix: "/admin/costs", domain: "inventory", access: "r" },
  { prefix: "/admin/guests", domain: "reports", access: "r" },
  { prefix: "/admin/workforce", domain: "hr", access: "r" },

  // ── Management: domain sections ──
  { prefix: "/management/hr", domain: "hr", access: "c" },
  { prefix: "/management/pos/bom", domain: "pos", access: "c" },
  { prefix: "/management/pos/price-lists", domain: "pos", access: "c" },
  { prefix: "/management/pos", domain: "pos", access: "c" },
  { prefix: "/management/procurement", domain: "procurement", access: "c" },
  { prefix: "/management/inventory", domain: "inventory", access: "c" },
  { prefix: "/management/operations/experiences", domain: "booking", access: "c" },
  { prefix: "/management/operations/scheduler", domain: "booking", access: "c" },
  { prefix: "/management/operations", domain: "ops", access: "c" },
  { prefix: "/management/maintenance", domain: "maintenance", access: "c" },
  { prefix: "/management/marketing", domain: "marketing", access: "c" },

  // ── Crew: role-specific tabs ──
  { prefix: "/crew/pos", domain: "pos", access: "c" },
  { prefix: "/crew/active-orders", domain: "pos", access: "r" },
  { prefix: "/crew/entry-validation", domain: "booking", access: "r" },
  { prefix: "/crew/restock", domain: "inventory_ops", access: "c" },
  { prefix: "/crew/logistics", domain: "inventory_ops", access: "c" },
  { prefix: "/crew/disposals", domain: "inventory_ops", access: "c" },
  { prefix: "/crew/maintenance", domain: "maintenance", access: "c" },
  { prefix: "/crew/incidents", domain: "ops", access: "c" },
] as const;

/**
 * Paths that bypass Gate 5 — per §7, shared routes rely on RLS and
 * page-level filtering instead of edge-level domain checks.
 */
const SHARED_BYPASS_PREFIXES: readonly string[] = [
  "/admin/reports",
  "/admin/audit",
  "/admin/announcements",
  "/admin/attendance",
  "/admin/settings",
  "/management/reports",
  "/management/audit",
  "/management/announcements",
  "/management/attendance",
  "/management/staffing",
  "/management/settings",
  "/crew/attendance",
  "/crew/schedule",
  "/crew/leave",
  "/crew/zone-scan",
  "/crew/feedback",
  "/crew/announcements",
  "/crew/settings",
];

export function resolveRouteRequirement(pathname: string): RouteRequirement | null {
  if (SHARED_BYPASS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return (
    ROUTE_MANIFEST.find(
      (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
    ) ?? null
  );
}

export function hasDomainAccess(
  domains: Record<string, readonly string[]> | undefined,
  domain: string,
  access: DomainAccess,
): boolean {
  if (!domains) return false;
  const tiers = domains[domain];
  return Array.isArray(tiers) && tiers.includes(access);
}

export function isSharedBypass(pathname: string): boolean {
  return SHARED_BYPASS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
