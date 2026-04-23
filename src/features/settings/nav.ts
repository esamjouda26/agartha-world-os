import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the Settings feature. Consumed ONLY by the nav
 * aggregator (`src/lib/nav/manifest.ts`) and from there by portal layouts
 * + the command palette. Never imported from middleware.
 *
 * Shared route: visible on every staff portal (admin / management / crew)
 * under the "shared" section. No `requires` gate — every authenticated
 * user edits their own profile; RLS on `profiles` enforces identity.
 */
export const nav: FeatureNav = {
  featureId: "settings",
  items: [
    {
      id: "admin-settings",
      portal: "admin",
      path: "/admin/settings",
      section: "shared",
      order: 99,
      iconName: "Settings",
      labelKey: "nav.admin.settings",
      label: "Settings",
    },
    {
      id: "mgmt-settings",
      portal: "management",
      path: "/management/settings",
      section: "shared",
      order: 99,
      iconName: "Settings",
      labelKey: "nav.mgmt.settings",
      label: "Settings",
    },
    {
      id: "crew-settings",
      portal: "crew",
      path: "/crew/settings",
      section: "shared",
      order: 99,
      iconName: "Settings",
      labelKey: "nav.crew.settings",
      label: "Settings",
    },
  ],
} as const;
