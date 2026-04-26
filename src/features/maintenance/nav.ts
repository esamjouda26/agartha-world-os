import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the Maintenance feature (frontend_spec.md §3g).
 *
 * Management items live in section "domains", order 600 — sequential
 * with the existing `mgmt-maintenance-incidents` item registered in
 * `src/features/incidents/nav.ts`.
 *
 * `/management/maintenance/device-topology` is `it:r` and is registered
 * by `src/features/it/nav.ts` to keep the gate co-located with its
 * domain owner per ADR-0004. Surfacing it under the "maintenance"
 * sidebar group is a labelling choice handled by the management layout
 * — the route's RBAC and nav-feature-of-record stays with `it`.
 */
export const nav: FeatureNav = {
  featureId: "maintenance",
  items: [
    // ── Management sidebar ────────────────────────────────────────────
    {
      id: "management-maintenance-orders",
      portal: "management",
      path: "/management/maintenance/orders",
      section: "domains",
      order: 600,
      iconName: "Wrench",
      labelKey: "nav.mgmt.maintenance.orders",
      label: "Work Orders",
      requires: { domain: "maintenance", access: "c" },
    },
    {
      id: "management-maintenance-vendors",
      portal: "management",
      path: "/management/maintenance/vendors",
      section: "domains",
      order: 600,
      iconName: "Truck",
      labelKey: "nav.mgmt.maintenance.vendors",
      label: "Vendor Registry",
      requires: { domain: "maintenance", access: "c" },
    },
    // ── Crew sidebar ──────────────────────────────────────────────────
    {
      id: "crew-maintenance-orders",
      portal: "crew",
      path: "/crew/maintenance/orders",
      section: "role",
      order: 600,
      iconName: "Wrench",
      labelKey: "nav.crew.maintenanceOrders",
      label: "Work Orders",
      requires: { domain: "maintenance", access: "c" },
    },
  ],
} as const;
