import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the POS feature (ADR-0004).
 *
 * Only top-level sidebar items live here. Deep-link routes
 * (`/management/pos/:id`, `/management/pos/:id/modifiers`,
 * `/management/pos/price-lists/:id`, `/management/pos/bom/:id`)
 * live in `rbac.ts` only — they are gated by middleware without
 * surfacing in any menu.
 */
export const nav: FeatureNav = {
  featureId: "pos",
  items: [
    // ── Crew ─────────────────────────────────────────────────────────
    {
      id: "crew-pos",
      portal: "crew",
      path: "/crew/pos",
      section: "role",
      order: 200,
      iconName: "ShoppingCart",
      labelKey: "nav.crew.pos",
      label: "POS",
      requires: { domain: "pos", access: "c" },
    },
    {
      id: "crew-active-orders",
      portal: "crew",
      path: "/crew/active-orders",
      section: "role",
      order: 200,
      iconName: "ChefHat",
      labelKey: "nav.crew.activeOrders",
      label: "Orders",
      requires: { domain: "pos", access: "r" },
    },
    // ── Management ───────────────────────────────────────────────────
    {
      id: "management-pos",
      portal: "management",
      path: "/management/pos",
      section: "domains",
      order: 200,
      iconName: "Monitor",
      labelKey: "nav.mgmt.pos",
      label: "POS Points",
      requires: { domain: "pos", access: "c" },
    },
    {
      id: "management-pos-orders",
      portal: "management",
      path: "/management/pos/orders",
      section: "domains",
      order: 200,
      iconName: "ShoppingCart",
      labelKey: "nav.mgmt.pos.orders",
      label: "Order Monitor",
      requires: { domain: "pos", access: "r" },
    },
    {
      id: "management-pos-price-lists",
      portal: "management",
      path: "/management/pos/price-lists",
      section: "domains",
      order: 200,
      iconName: "Tags",
      labelKey: "nav.mgmt.pos.priceLists",
      label: "Price Lists",
      requires: { domain: "pos", access: "c" },
    },
    {
      id: "management-pos-bom",
      portal: "management",
      path: "/management/pos/bom",
      section: "domains",
      order: 200,
      iconName: "BookOpen",
      labelKey: "nav.mgmt.pos.bom",
      label: "Bill of Materials",
      requires: { domain: "pos", access: "c" },
    },
  ],
} as const;
