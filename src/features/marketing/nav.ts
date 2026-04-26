import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the Marketing / Survey feature — ADR-0004.
 * /crew/feedback is a shared crew route (no domain gate) — all authenticated crew.
 *
 * Management entries gated by `marketing:c` (campaigns, promos) or
 * `marketing:r` (surveys) per frontend_spec.md §3f.
 */
export const nav: FeatureNav = {
  featureId: "marketing",
  items: [
    // ── Management sidebar ────────────────────────────────────────────
    {
      id: "management-marketing-campaigns",
      portal: "management",
      path: "/management/marketing/campaigns",
      section: "domains",
      order: 600,
      iconName: "Megaphone",
      labelKey: "nav.mgmt.marketing.campaigns",
      label: "Campaigns",
      requires: { domain: "marketing", access: "c" },
    },
    {
      id: "management-marketing-promos",
      portal: "management",
      path: "/management/marketing/promos",
      section: "domains",
      order: 601,
      iconName: "Tags",
      labelKey: "nav.mgmt.marketing.promos",
      label: "Promo Codes",
      requires: { domain: "marketing", access: "c" },
    },
    {
      id: "management-marketing-surveys",
      portal: "management",
      path: "/management/marketing/surveys",
      section: "domains",
      order: 602,
      iconName: "LineChart",
      labelKey: "nav.mgmt.marketing.surveys",
      label: "Survey Analytics",
      requires: { domain: "marketing", access: "r" },
    },
    // ── Crew sidebar ──────────────────────────────────────────────────
    {
      id: "crew-feedback",
      portal: "crew",
      path: "/crew/feedback",
      section: "shared",
      order: 700,
      iconName: "MessageSquare",
      labelKey: "nav.crew.feedback",
      label: "Feedback",
    },
  ],
} as const;
