import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * Settings is a shared route under all three staff portals per
 * `frontend_spec.md §6` / spec line 4033 — every authenticated staff
 * user edits their own profile. No domain gating. Middleware Gate 5
 * passage is handled by `SHARED_BYPASS_PREFIXES` in
 * `src/lib/rbac/middleware-manifest.ts`; RLS on `profiles` enforces
 * that only the caller's own row is readable/writable.
 *
 * `routes` is therefore empty by design: there is no URL pattern to
 * protect at the Edge.
 */
export const rbac: FeatureRbac = {
  featureId: "settings",
  routes: [],
} as const;
