import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the IT Infrastructure feature.
 * Consumed ONLY by `src/lib/nav/manifest.ts`.
 *
 * IT-admin section: visible only to admins with `it:c`. Business admins
 * (who lack `it:c`) never see these items — they see the Business section
 * items from the executive feature instead.
 */
export const nav: FeatureNav = {
  featureId: "it",
  items: [
    {
      id: "admin-it-dashboard",
      portal: "admin",
      path: "/admin/it",
      section: "it",
      order: 10,
      iconName: "LayoutDashboard",
      labelKey: "nav.admin.itDashboard",
      label: "Dashboard",
      requires: { domain: "it", access: "c" },
    },
    {
      id: "admin-devices",
      portal: "admin",
      path: "/admin/devices",
      section: "it",
      order: 20,
      iconName: "HardDrive",
      labelKey: "nav.admin.devices",
      label: "Devices",
      requires: { domain: "it", access: "c" },
    },
    {
      id: "admin-system-health",
      portal: "admin",
      path: "/admin/system-health",
      section: "it",
      order: 30,
      iconName: "Activity",
      labelKey: "nav.admin.systemHealth",
      label: "System Health",
      requires: { domain: "it", access: "c" },
    },
    {
      // UOM Conversions — admin twin of /management/uom. Page + data live
      // under src/features/procurement/; this entry only registers the
      // sidebar link on the IT-admin sidebar.
      id: "admin-it-uom",
      portal: "admin",
      path: "/admin/it/uom",
      section: "it",
      order: 40,
      iconName: "Ruler",
      labelKey: "nav.admin.uom",
      label: "UOM Conversions",
      requires: { domain: "system", access: "c" },
    },
    // Management-portal sidebar entry for the shared
    // <DeviceTopologyPage> consumed by /management/maintenance/device-
    // topology. Gated `it:r` per spec — keeps the topology nav entry
    // co-located with the IT feature that owns the data, even though
    // the URL nests under /management/maintenance/. Order 600 puts it
    // alongside the other maintenance items registered in
    // src/features/maintenance/nav.ts and incidents/nav.ts.
    {
      id: "management-maintenance-device-topology",
      portal: "management",
      path: "/management/maintenance/device-topology",
      section: "domains",
      order: 600,
      iconName: "GitBranch",
      labelKey: "nav.mgmt.maintenance.deviceTopology",
      label: "Device Topology",
      requires: { domain: "it", access: "r" },
    },
  ],
} as const;
