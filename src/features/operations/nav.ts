import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the Operations feature — ADR-0004.
 * /crew/zone-scan is a shared crew route (no domain gate) — RLS enforces access.
 * /admin/operations is gated via operations/rbac.ts.
 */
export const nav: FeatureNav = {
  featureId: "operations",
  items: [
    {
      id: "crew-zone-scan",
      portal: "crew",
      path: "/crew/zone-scan",
      section: "shared",
      order: 50,
      iconName: "QrCode",
      labelKey: "nav.crew.zoneScan",
      label: "Zone Scan",
    },
  ],
} as const;
