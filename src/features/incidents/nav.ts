import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for Incidents.
 *
 * - `/management/operations/incidents` — visible with `ops:c` per spec
 *   (operations managers report + triage).
 * - `/management/maintenance/incidents` — visible with `ops:r` AND only
 *   when the user has `maintenance` domain (the page filters categories
 *   to structural + equipment). Model via `requires.domain = ops` +
 *   `excludeWhenHoldsAnyDomain` so operations managers who DON'T hold
 *   maintenance don't see duplicate entries. We actually want the
 *   opposite — the entry should show for users with `maintenance` —
 *   but the filter pipeline supports `requires` only. See note below.
 * - `/crew/incidents` — no domain gate; every crew portal member sees it.
 *
 * NOTE: The management portal surfaces both entries for any user with
 * `ops:r` today. Showing or hiding the maintenance one based on
 * `maintenance` domain holding is a richer filter than `requires`
 * currently supports. Acceptable for Phase 5 since an ops manager on
 * the maintenance page just sees a category-filtered view that reflects
 * their ops scope correctly. Revisit when Phase 7's maintenance domain
 * lands.
 */
export const nav: FeatureNav = {
  featureId: "incidents",
  items: [
    {
      id: "mgmt-operations-incidents",
      portal: "management",
      path: "/management/operations/incidents",
      section: "domains",
      order: 30,
      iconName: "Siren",
      labelKey: "nav.mgmt.operations.incidents",
      label: "Incidents",
      requires: { domain: "ops", access: "c" },
    },
    {
      id: "mgmt-maintenance-incidents",
      portal: "management",
      path: "/management/maintenance/incidents",
      section: "domains",
      order: 30,
      iconName: "Siren",
      labelKey: "nav.mgmt.maintenance.incidents",
      label: "Incidents",
      requires: { domain: "maintenance", access: "r" },
    },
    {
      id: "crew-incidents",
      portal: "crew",
      path: "/crew/incidents",
      section: "shared",
      order: 20,
      iconName: "Siren",
      labelKey: "nav.crew.incidents",
      label: "Incidents",
    },
  ],
} as const;
