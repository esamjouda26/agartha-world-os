import { rbac as attendanceRbac } from "@/features/attendance/rbac";
import { rbac as pendingRbac } from "@/features/_pending/rbac";

import type { RouteRequirement } from "./types";

/*
 * NOTE on runtime scope: this module is pure compile-time data — no I/O,
 * no secrets, no Supabase access. It is intentionally NOT marked
 * `server-only` so the build-time CI scripts in `scripts/rbac-*.ts` can
 * import it under plain Node. The server-only boundary is enforced in
 * `./policy.ts` which IS the module middleware and Server Components
 * import.
 */

/**
 * Edge-side route manifest. Imports ONLY from each feature's `rbac.ts` — never from
 * `src/lib/nav/**` or any icon/i18n module. The ESLint `no-restricted-imports`
 * rule enforces the boundary mechanically.
 *
 * URLPatterns are compiled once at module load (cold-start cost ~microseconds
 * per pattern on V8). Lookup is a linear scan of the pre-sorted array — fine
 * up to a few hundred routes and within the Vercel Edge Middleware 50ms
 * CPU budget per CLAUDE.md §14.
 */

const FEATURE_RBAC = [attendanceRbac, pendingRbac] as const;

/**
 * Scores patterns by literal-scaffold length minus wildcard penalty plus a
 * small bonus per named parameter. More literal characters = more specific.
 * Wildcards (`*`) reduce specificity; named params (`:id`) add a small
 * tiebreaker.
 *
 * Example (asserted in `policy.test.ts`):
 *   /admin/iam/:id        > /admin/iam           (11010 vs 10000)
 *   /management/pos/bom   > /management/pos{/*}? (19000 vs 14900)
 */
export function specificityScore(pattern: string): number {
  const literalsOnly = pattern
    .replace(/:\w+\??/g, "")
    .replace(/\{[^}]*\}\??/g, "")
    .replace(/\*/g, "");
  const paramCount = (pattern.match(/:\w+/g) ?? []).length;
  const wildcardCount = (pattern.match(/\*/g) ?? []).length;
  return literalsOnly.length * 1000 + paramCount * 10 - wildcardCount * 100;
}

export type CompiledRoute = Readonly<{
  /** Native URLPattern instance — matched against `https://x${path}`. */
  pattern: URLPattern;
  /** Raw pattern string, kept for logging / diagnostics. */
  patternSource: string;
  req: RouteRequirement;
  /** Feature that owns this route, used by CI gates to locate the source. */
  featureId: string;
}>;

function compileAll(): readonly CompiledRoute[] {
  const all: CompiledRoute[] = [];
  for (const feature of FEATURE_RBAC) {
    for (const req of feature.routes) {
      all.push({
        pattern: new URLPattern({ pathname: req.pattern }),
        patternSource: req.pattern,
        req,
        featureId: feature.featureId,
      });
    }
  }
  // Sort most-specific-first so the first match wins (see JSDoc on
  // `specificityScore`).
  all.sort((a, b) => specificityScore(b.patternSource) - specificityScore(a.patternSource));
  return all;
}

export const MIDDLEWARE_ROUTES: readonly CompiledRoute[] = compileAll();

/**
 * Shared staff routes that bypass Gate 5 — matches the legacy
 * `SHARED_BYPASS_PREFIXES` in `src/lib/rbac/route-manifest.ts`. These
 * paths rely on RLS + page-level filtering, not edge domain checks.
 *
 * Prefixes, not patterns — the policy module matches with
 * `path === prefix || path.startsWith(`${prefix}/`)` to preserve the
 * legacy semantics byte-for-byte.
 */
export const SHARED_BYPASS_PREFIXES: readonly string[] = [
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
  "/crew/incidents",
  "/crew/announcements",
  "/crew/settings",
] as const;
