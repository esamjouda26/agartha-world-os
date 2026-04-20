import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the Attendance feature. Consumed ONLY by
 * `src/lib/rbac/middleware-manifest.ts` (Edge bundle). Icon names, nav
 * labels, and section ordering live in `./nav.ts` — never here.
 *
 * Attendance is a shared route under all three portals per
 * `frontend_spec.md §8` — every authenticated staff user can see it, so
 * it carries NO Gate 5 requirement. The shared-bypass allowlist in
 * `src/lib/rbac/policy.ts` handles middleware passage; RLS on
 * `timecard_punches` + `time_exceptions` enforces row-level access.
 *
 * `routes` is therefore empty by design: there is no URL pattern to
 * protect at the Edge. The `primaryTables` metadata is out-of-band
 * (commented) for the `rbac:rls-parity` CI gate to reference if this
 * feature ever adds a domain-gated deep-link route.
 */
export const rbac: FeatureRbac = {
  featureId: "attendance",
  routes: [],
} as const;
