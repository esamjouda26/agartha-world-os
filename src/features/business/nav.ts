import type { FeatureNav } from "@/lib/nav/types";

/**
 * Business-admin nav entries.
 *
 * Every item carries `excludeWhenHoldsAnyDomain: [{ domain: "it", access: "c" }]`.
 * This is the persona-split mechanism: IT admins hold `it:c`, which causes the
 * entire Business section to be hidden from their sidebar, leaving only the IT
 * and System sections visible. Business admins never hold `it:c`, so they see
 * this section exclusively.
 *
 * The middleware / Server Actions / RBAC gates are NOT changed — business routes
 * still enforce their own domain checks; the persona split is UX-only.
 *
 * Reference: ADR-0004 §"IT vs Business persona split" + filter.ts
 * `isExcludedByDomain` + `FeatureNavItem.excludeWhenHoldsAnyDomain`.
 */

const EXCLUDE_FROM_IT_PERSONA = [{ domain: "it", access: "c" as const }] as const;

export const nav: FeatureNav = {
  featureId: "business",
  items: [
    {
      id: "admin-business",
      portal: "admin",
      path: "/admin/business",
      section: "business",
      order: 10,
      iconName: "LayoutDashboard",
      labelKey: "nav.admin.business",
      label: "Overview",
      requires: { domain: "booking", access: "r" },
      excludeWhenHoldsAnyDomain: EXCLUDE_FROM_IT_PERSONA,
    },
    {
      id: "admin-revenue",
      portal: "admin",
      path: "/admin/revenue",
      section: "business",
      order: 20,
      iconName: "LineChart",
      labelKey: "nav.admin.revenue",
      label: "Revenue",
      requires: { domain: "booking", access: "r" },
      excludeWhenHoldsAnyDomain: EXCLUDE_FROM_IT_PERSONA,
    },
    {
      id: "admin-operations",
      portal: "admin",
      path: "/admin/operations",
      section: "business",
      order: 30,
      iconName: "Activity",
      labelKey: "nav.admin.operations",
      label: "Operations",
      requires: { domain: "ops", access: "r" },
      excludeWhenHoldsAnyDomain: EXCLUDE_FROM_IT_PERSONA,
    },
    {
      id: "admin-costs",
      portal: "admin",
      path: "/admin/costs",
      section: "business",
      order: 40,
      iconName: "Wallet",
      labelKey: "nav.admin.costs",
      label: "Costs & Waste",
      requires: { domain: "inventory", access: "r" },
      excludeWhenHoldsAnyDomain: EXCLUDE_FROM_IT_PERSONA,
    },
    {
      id: "admin-guests",
      portal: "admin",
      path: "/admin/guests",
      section: "business",
      order: 50,
      iconName: "MessageCircle",
      labelKey: "nav.admin.guests",
      label: "Guests",
      requires: { domain: "reports", access: "r" },
      excludeWhenHoldsAnyDomain: EXCLUDE_FROM_IT_PERSONA,
    },
    {
      id: "admin-workforce",
      portal: "admin",
      path: "/admin/workforce",
      section: "business",
      order: 60,
      iconName: "UsersRound",
      labelKey: "nav.admin.workforce",
      label: "Workforce",
      requires: { domain: "hr", access: "r" },
      excludeWhenHoldsAnyDomain: EXCLUDE_FROM_IT_PERSONA,
    },
  ],
} as const;
