import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the Inventory Operations feature.
 * Consumed ONLY by `src/lib/rbac/middleware-manifest.ts` (Edge bundle).
 * Icon names, nav labels, and section ordering live in `./nav.ts` — never here.
 *
 * Primary tables: material_requisitions, inventory_reconciliations, write_offs.
 * RLS on those tables must mirror the access pairs declared below.
 */
export const rbac: FeatureRbac = {
  featureId: "inventory",
  routes: [
    // ── Management ────────────────────────────────────────────────────
    {
      pattern: "/management/inventory",
      domain: "inventory",
      access: "c",
      primaryTables: ["materials", "stock_balance_cache"],
    },
    {
      pattern: "/management/inventory/requisitions",
      domain: "inventory_ops",
      access: "c",
      primaryTables: ["material_requisitions", "material_requisition_items"],
    },
    {
      pattern: "/management/inventory/requisitions/:id",
      domain: "inventory_ops",
      access: "c",
      primaryTables: ["material_requisitions", "material_requisition_items"],
    },
    {
      pattern: "/management/inventory/reconciliation",
      domain: "inventory_ops",
      access: "c",
      primaryTables: [
        "inventory_reconciliations",
        "inventory_reconciliation_items",
      ],
    },
    {
      pattern: "/management/inventory/reconciliation/:id",
      domain: "inventory_ops",
      access: "c",
      primaryTables: [
        "inventory_reconciliations",
        "inventory_reconciliation_items",
      ],
    },
    {
      // Cross-domain: inventory_ops:r OR pos:r. The CI rls-parity check
      // accepts either domain match against `write_offs` policies.
      pattern: "/management/inventory/write-offs",
      domain: "inventory_ops",
      access: "r",
      primaryTables: ["write_offs"],
      additionalDomains: [{ domain: "pos", access: "r" }],
    },
    {
      pattern: "/management/inventory/equipment",
      domain: "inventory_ops",
      access: "c",
      primaryTables: ["equipment_assignments"],
    },
    {
      // Page is read-gated on inventory_ops:r (the ledger). The
      // Movement-Types tab gate (`inventory:c|u`) is enforced inside
      // the page + the upsertMovementType action — both views are
      // accessible to any inventory_ops:r user; only the type-CRUD
      // CTA gates further.
      pattern: "/management/inventory/movements",
      domain: "inventory_ops",
      access: "r",
      primaryTables: ["goods_movements", "goods_movement_items"],
    },
    {
      pattern: "/management/inventory/valuation",
      domain: "inventory",
      access: "r",
      primaryTables: ["material_valuation", "stock_balance_cache"],
    },
    // ── Crew ──────────────────────────────────────────────────────────
    {
      pattern: "/crew/restock",
      domain: "inventory_ops",
      access: "c",
      primaryTables: ["material_requisitions", "material_requisition_items"],
    },
    {
      pattern: "/crew/logistics/restock-queue",
      domain: "inventory_ops",
      access: "c",
      primaryTables: ["material_requisitions", "material_requisition_items"],
    },
    {
      pattern: "/crew/logistics/stock-count",
      domain: "inventory_ops",
      access: "r",
      primaryTables: ["inventory_reconciliations", "inventory_reconciliation_items"],
    },
    {
      pattern: "/crew/disposals",
      domain: "inventory_ops",
      access: "c",
      primaryTables: ["write_offs"],
    },
  ],
} as const;
