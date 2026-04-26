import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the Marketing / Survey feature — ADR-0004.
 * /crew/feedback is a shared crew route (no domain gate) — all authenticated crew.
 */
export const nav: FeatureNav = {
  featureId: "marketing",
  items: [
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
