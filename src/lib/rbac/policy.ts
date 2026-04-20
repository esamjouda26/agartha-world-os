import "server-only";

import { MIDDLEWARE_ROUTES, SHARED_BYPASS_PREFIXES } from "./middleware-manifest";
import type { DomainAccess, LocaleStrippedPath, RouteRequirement } from "./types";

/**
 * Gate-5 policy module. The only RBAC module middleware.ts should import
 * directly. Pure, synchronous, no I/O, no DB lookups — every decision is
 * a constant-time lookup over `MIDDLEWARE_ROUTES` and the bypass list.
 *
 * Audit logging is deliberately NOT emitted from here — pino is not
 * Edge-safe and CLAUDE.md §8 bans `console.log` in production paths.
 * Tracking: ADR-0004 "Known gap — audit logging for Gate 5 denials"
 * (follow-up ticket to route denials via Upstash → `system_audit_log`).
 */

/**
 * Legacy prefix-bypass test — preserved byte-for-byte from
 * `src/lib/rbac/route-manifest.ts#isSharedBypass`. Shared routes
 * (Attendance, Settings, Announcements, Reports, Audit, etc.) rely on
 * RLS + page-level filtering instead of edge domain checks.
 */
export function isSharedBypass(path: LocaleStrippedPath): boolean {
  return SHARED_BYPASS_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Returns the most-specific `RouteRequirement` matching the path, or
 * `null` when no route is registered. Caller (middleware) must test
 * `isSharedBypass` FIRST — bypass has priority over domain gating so
 * shared staff routes don't accidentally inherit a broad pattern.
 *
 * URLPattern compilation happens in `middleware-manifest.ts` at module
 * load; this function performs only `.test()` calls, which are
 * constant-time per pattern.
 */
export function resolveRouteRequirement(path: LocaleStrippedPath): RouteRequirement | null {
  // URLPattern requires a full URL — synthesize an origin.
  const testUrl = `https://x${path}`;
  for (const compiled of MIDDLEWARE_ROUTES) {
    if (compiled.pattern.test(testUrl)) {
      return compiled.req;
    }
  }
  return null;
}

/**
 * Checks whether the JWT `domains` claim carries the required access
 * tier. Semantically identical to the legacy
 * `src/lib/rbac/route-manifest.ts#hasDomainAccess`.
 */
export function hasDomainAccess(
  domains: Record<string, readonly string[]> | undefined,
  domain: string,
  access: DomainAccess,
): boolean {
  if (!domains) return false;
  const tiers = domains[domain];
  return Array.isArray(tiers) && tiers.includes(access);
}
