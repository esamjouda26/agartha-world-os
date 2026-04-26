import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC for the marketing / survey feature (ADR-0004).
 *
 * /crew/feedback is in SHARED_BYPASS_PREFIXES — no domain gate at Edge.
 * Management routes gated by `marketing` domain claims; RLS on
 * `campaigns`, `promo_codes`, `promo_valid_tiers` enforces the same
 * pairs at row level (init_schema.sql:3768-3799). `survey_responses`
 * SELECT accepts `reports:r` OR `marketing:r` (init_schema.sql:3966-3969)
 * — surveys page widens via additionalDomains.
 */
export const rbac: FeatureRbac = {
  featureId: "marketing",
  routes: [
    {
      pattern: "/management/marketing/campaigns",
      domain: "marketing",
      access: "c",
      primaryTables: ["campaigns", "promo_codes"],
    },
    {
      pattern: "/management/marketing/promos",
      domain: "marketing",
      access: "c",
      primaryTables: ["promo_codes", "promo_valid_tiers", "tiers", "campaigns"],
    },
    {
      pattern: "/management/marketing/surveys",
      domain: "marketing",
      access: "r",
      primaryTables: ["survey_responses", "bookings", "experiences", "profiles"],
      additionalDomains: [{ domain: "reports", access: "r" }],
    },
  ],
} as const;
