import type { FeatureNav } from "@/lib/nav/types";

/**
 * Staffing navigation — management portal only. Single entry under
 * "Shared" since it's not a domain-specific route (all managers see
 * the same surface).
 */
export const nav: FeatureNav = {
  featureId: "staffing",
  items: [
    {
      id: "mgmt-staffing",
      portal: "management",
      path: "/management/staffing",
      section: "shared",
      order: 20,
      iconName: "UsersRound",
      labelKey: "nav.mgmt.staffing",
      label: "Active staff",
      requires: { domain: "reports", access: "r" },
    },
  ],
} as const;
