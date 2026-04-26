import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the Procurement feature.
 * Consumed ONLY by `src/lib/rbac/middleware-manifest.ts` (Edge bundle).
 * Icon names, nav labels, and section ordering live in `./nav.ts` — never here.
 *
 * Primary tables: materials, purchase_orders, purchase_order_items, suppliers.
 * RLS on those tables must mirror the access pairs declared below.
 */
export const rbac: FeatureRbac = {
  featureId: "procurement",
  routes: [
    // ── Crew ──────────────────────────────────────────────────────────
    {
      pattern: "/crew/logistics/po-receiving",
      domain: "procurement",
      access: "u",
      primaryTables: ["purchase_orders", "purchase_order_items"],
    },
    // ── Management ────────────────────────────────────────────────────
    {
      pattern: "/management/procurement",
      domain: "procurement",
      access: "c",
      primaryTables: ["materials"],
    },
    {
      pattern: "/management/procurement/:id",
      domain: "procurement",
      access: "c",
      primaryTables: ["materials", "material_procurement_data"],
    },
    {
      pattern: "/management/procurement/reorder",
      domain: "procurement",
      access: "c",
      primaryTables: ["purchase_orders", "purchase_order_items"],
    },
    {
      pattern: "/management/procurement/purchase-orders",
      domain: "procurement",
      access: "c",
      primaryTables: ["purchase_orders"],
    },
    {
      pattern: "/management/procurement/purchase-orders/:id",
      domain: "procurement",
      access: "c",
      primaryTables: ["purchase_orders", "purchase_order_items"],
    },
    {
      pattern: "/management/procurement/suppliers",
      domain: "procurement",
      access: "c",
      primaryTables: ["suppliers"],
    },
    {
      pattern: "/management/procurement/suppliers/:id",
      domain: "procurement",
      access: "r",
      primaryTables: ["suppliers"],
    },
    // ── Cross-domain shared routes (data layer owned by procurement) ─
    {
      pattern: "/management/categories",
      domain: "procurement",
      access: "c",
      primaryTables: ["material_categories", "location_allowed_categories"],
      additionalDomains: [{ domain: "pos", access: "c" }],
    },
    {
      pattern: "/management/uom",
      domain: "procurement",
      access: "c",
      primaryTables: ["uom_conversions"],
      additionalDomains: [
        { domain: "pos", access: "c" },
        { domain: "system", access: "c" },
      ],
    },
    {
      // Admin-twin of the UOM page for the IT admin persona.
      pattern: "/admin/it/uom",
      domain: "system",
      access: "c",
      primaryTables: ["uom_conversions"],
    },
  ],
} as const;
