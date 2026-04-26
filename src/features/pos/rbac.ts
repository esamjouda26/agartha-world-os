import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the POS feature (ADR-0004).
 *
 * Crew routes: `/crew/pos` (pos:c), `/crew/active-orders` (pos:r).
 * Management routes: all /management/pos/* require pos:c (read+write view);
 * actual write mutations are additionally RLS-gated to system:c/system:u
 * for pos_points (init_schema.sql:1285-1289) and pos:c/pos:u for catalog,
 * display_categories, bill_of_materials, etc. (init_schema.sql:2374-2415).
 *
 * primaryTables refs: init_schema.sql:1079 (pos_points), 3022 (orders),
 * 3038 (order_items), 2225 (bill_of_materials), 2248 (bom_components),
 * 2264 (price_lists), 2277 (price_list_items), 3049 (pos_modifier_groups),
 * 3063 (pos_modifier_options), 3080 (material_modifier_groups).
 */
export const rbac: FeatureRbac = {
  featureId: "pos",
  routes: [
    // Crew routes
    {
      pattern: "/crew/pos",
      domain: "pos",
      access: "c",
      primaryTables: ["orders", "order_items"],
    },
    {
      pattern: "/crew/active-orders",
      domain: "pos",
      access: "r",
      primaryTables: ["orders", "order_items"],
    },
    // Management routes
    {
      pattern: "/management/pos",
      domain: "pos",
      access: "c",
      primaryTables: ["pos_points"],
    },
    {
      pattern: "/management/pos/orders",
      domain: "pos",
      access: "r",
      primaryTables: ["orders", "order_items"],
    },
    {
      pattern: "/management/pos/price-lists",
      domain: "pos",
      access: "c",
      primaryTables: ["price_lists"],
    },
    {
      pattern: "/management/pos/price-lists/:id",
      domain: "pos",
      access: "c",
      primaryTables: ["price_list_items"],
    },
    {
      pattern: "/management/pos/bom",
      domain: "pos",
      access: "c",
      primaryTables: ["bill_of_materials"],
    },
    {
      pattern: "/management/pos/bom/:id",
      domain: "pos",
      access: "c",
      primaryTables: ["bom_components"],
    },
    {
      pattern: "/management/pos/:id",
      domain: "pos",
      access: "c",
      primaryTables: ["material_sales_data", "display_categories"],
    },
    {
      pattern: "/management/pos/:id/modifiers",
      domain: "pos",
      access: "c",
      primaryTables: ["pos_modifier_groups", "pos_modifier_options"],
    },
  ],
} as const;
