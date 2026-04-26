import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the Procurement feature — ADR-0004.
 * Consumed ONLY by the nav aggregator (`src/lib/nav/manifest.ts`) and from
 * there by portal layouts + the command palette. Never imported from middleware.
 */
export const nav: FeatureNav = {
  featureId: "procurement",
  items: [
    // ── Management sidebar ────────────────────────────────────────────
    {
      id: "management-procurement",
      portal: "management",
      path: "/management/procurement",
      section: "domains",
      order: 500,
      iconName: "Package",
      labelKey: "nav.mgmt.procurement",
      label: "Materials",
      requires: { domain: "procurement", access: "c" },
    },
    {
      id: "management-procurement-reorder",
      portal: "management",
      path: "/management/procurement/reorder",
      section: "domains",
      order: 500,
      iconName: "ShoppingCart",
      labelKey: "nav.mgmt.procurement.reorder",
      label: "Reorder",
      requires: { domain: "procurement", access: "c" },
    },
    {
      id: "management-procurement-pos",
      portal: "management",
      path: "/management/procurement/purchase-orders",
      section: "domains",
      order: 500,
      iconName: "ClipboardList",
      labelKey: "nav.mgmt.procurement.pos",
      label: "Purchase Orders",
      requires: { domain: "procurement", access: "c" },
    },
    {
      id: "management-procurement-suppliers",
      portal: "management",
      path: "/management/procurement/suppliers",
      section: "domains",
      order: 500,
      iconName: "Truck",
      labelKey: "nav.mgmt.procurement.suppliers",
      label: "Suppliers",
      requires: { domain: "procurement", access: "c" },
    },
    // ── Cross-domain shared routes ──────────────────────────────────
    {
      // Material categories — owned by procurement+pos. Single sidebar
      // entry in the procurement section; visibility widens to pos:c via
      // `additionalDomains` so a POS-only manager still sees it.
      id: "management-categories",
      portal: "management",
      path: "/management/categories",
      section: "domains",
      order: 500,
      iconName: "Tags",
      labelKey: "nav.mgmt.categories",
      label: "Categories",
      requires: {
        domain: "procurement",
        access: "c",
        additionalDomains: [{ domain: "pos", access: "c" }],
      },
    },
    {
      // UOM Conversions — owned by procurement, accessible to pos + system.
      // IT-admin entry lives separately in src/features/it/nav.ts so it
      // surfaces in the admin portal's IT section.
      id: "management-uom",
      portal: "management",
      path: "/management/uom",
      section: "domains",
      order: 500,
      iconName: "Ruler",
      labelKey: "nav.mgmt.uom",
      label: "UOM Conversions",
      requires: {
        domain: "procurement",
        access: "c",
        additionalDomains: [
          { domain: "pos", access: "c" },
          { domain: "system", access: "c" },
        ],
      },
    },
    // ── Crew sidebar ──────────────────────────────────────────────────
    {
      id: "crew-po-receiving",
      portal: "crew",
      path: "/crew/logistics/po-receiving",
      section: "role",
      order: 500,
      iconName: "PackageCheck",
      labelKey: "nav.crew.poReceiving",
      label: "PO Receiving",
      requires: { domain: "procurement", access: "u" },
    },
  ],
} as const;
