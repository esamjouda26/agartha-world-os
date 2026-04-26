import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC for the marketing / survey feature (ADR-0004).
 * /crew/feedback is in SHARED_BYPASS_PREFIXES — no domain gate at Edge.
 * routes array is empty by design; RLS on survey_responses enforces
 * staff_submitted = TRUE AND submitted_by = auth.uid().
 */
export const rbac: FeatureRbac = {
  featureId: "marketing",
  routes: [],
} as const;
