import { rbac as announcementsRbac } from "@/features/announcements/rbac";
import { rbac as attendanceRbac } from "@/features/attendance/rbac";
import { rbac as auditRbac } from "@/features/audit/rbac";
import { rbac as incidentsRbac } from "@/features/incidents/rbac";
import { rbac as reportsRbac } from "@/features/reports/rbac";
import { rbac as staffingRbac } from "@/features/staffing/rbac";

import type { RouteRequirement } from "./types";

/*
 * NOTE on runtime scope: this module is pure compile-time data — no I/O,
 * no secrets, no Supabase access. It is intentionally NOT marked
 * `server-only` so the build-time CI scripts in `scripts/rbac-*.ts` can
 * import it under plain Node. The server-only boundary is enforced in
 * `./policy.ts` which IS the module middleware and Server Components
 * import.
 *
 * Single source of truth per ADR-0004: every Gate-5-gated route lives in
 * exactly one feature's `rbac.ts`. There is NO transitional holding pen;
 * unimplemented routes have no feature folder, no sidebar entry, and no
 * middleware gate (they 404 naturally if someone deep-links them).
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

const FEATURE_RBAC = [
  attendanceRbac,
  announcementsRbac,
  auditRbac,
  incidentsRbac,
  reportsRbac,
  staffingRbac,
] as const;

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
 * Cross-portal shared routes that bypass Gate 5 — the prefix AND all its
 * children. These routes render via Phase-5 shared components (Settings,
 * Announcements, Reports, Audit, Staffing, Attendance). RLS + page-level
 * query scoping enforce row-level access.
 */
export const SHARED_BYPASS_PREFIXES: readonly string[] = [
  // ── Admin ──
  // /admin/reports — Gate 5 (reports:r) via reports/rbac.ts
  // /admin/audit   — Gate 5 (reports:r) via audit/rbac.ts
  // /admin/announcements — Gate 5 (comms:c) via announcements/rbac.ts
  "/admin/attendance",
  "/admin/settings",
  // ── Management ──
  // /management/reports — Gate 5 (reports:r) via reports/rbac.ts
  // /management/audit   — Gate 5 (reports:r) via audit/rbac.ts
  // /management/announcements — Gate 5 (comms:c) via announcements/rbac.ts
  // /management/staffing — Gate 5 (reports:r) via staffing/rbac.ts
  "/management/attendance",
  "/management/settings",
  // ── Crew ──
  "/crew/attendance",
  "/crew/schedule",
  "/crew/leave",
  "/crew/zone-scan",
  "/crew/feedback",
  "/crew/incidents",
  // Crew do not get a route for announcements — they read via the topbar bell only.
  "/crew/settings",
] as const;

/**
 * Portal landing / welcome pages that bypass Gate 5 on EXACT match only.
 * Deeper paths (e.g. `/admin/business/revenue`) must have their own
 * feature `rbac.ts` entry or they fail the `rbac:orphan-routes` CI gate.
 * This prevents a too-loose prefix bypass from shielding future
 * sub-routes that never got a proper domain gate.
 */
export const EXACT_BYPASSES: readonly string[] = [
  "/admin/it", // IT-persona landing
  "/admin/business", // Business-persona landing
  "/management", // root redirect page
] as const;
