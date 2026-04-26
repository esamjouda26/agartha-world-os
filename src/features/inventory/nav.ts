import type { FeatureNav } from "@/lib/nav/types";

/**
 * Navigation entries for the Inventory Operations feature. Consumed ONLY by
 * the nav aggregator (`src/lib/nav/manifest.ts`) and from there by portal
 * layouts + the command palette. Never imported from middleware.
 *
 * All items live in the "role" section of the crew portal — gated by
 * inventory_ops domain claims per ADR-0004.
 */
export const nav: FeatureNav = {
  featureId: "inventory",
  items: [
    // ── Management sidebar ────────────────────────────────────────────
    {
      id: "management-inventory",
      portal: "management",
      path: "/management/inventory",
      section: "domains",
      order: 400,
      iconName: "Boxes",
      labelKey: "nav.mgmt.inventory",
      label: "Materials & Stock",
      requires: { domain: "inventory", access: "c" },
    },
    {
      id: "management-inventory-requisitions",
      portal: "management",
      path: "/management/inventory/requisitions",
      section: "domains",
      order: 400,
      iconName: "ClipboardList",
      labelKey: "nav.mgmt.inventory.requisitions",
      label: "Requisitions",
      requires: { domain: "inventory_ops", access: "c" },
    },
    {
      id: "management-inventory-reconciliation",
      portal: "management",
      path: "/management/inventory/reconciliation",
      section: "domains",
      order: 400,
      iconName: "ScanLine",
      labelKey: "nav.mgmt.inventory.reconciliation",
      label: "Stock Reconciliation",
      requires: { domain: "inventory_ops", access: "c" },
    },
    {
      // Cross-domain — visible to inventory_ops:r OR pos:r users (single
      // sidebar entry; OR-widening via additionalDomains keeps the
      // sidebar from duplicating).
      id: "management-inventory-write-offs",
      portal: "management",
      path: "/management/inventory/write-offs",
      section: "domains",
      order: 400,
      iconName: "Trash2",
      labelKey: "nav.mgmt.inventory.writeOffs",
      label: "Write-Offs",
      requires: {
        domain: "inventory_ops",
        access: "r",
        additionalDomains: [{ domain: "pos", access: "r" }],
      },
    },
    {
      id: "management-inventory-equipment",
      portal: "management",
      path: "/management/inventory/equipment",
      section: "domains",
      order: 400,
      iconName: "HardDrive",
      labelKey: "nav.mgmt.inventory.equipment",
      label: "Equipment Custody",
      requires: { domain: "inventory_ops", access: "c" },
    },
    {
      id: "management-inventory-movements",
      portal: "management",
      path: "/management/inventory/movements",
      section: "domains",
      order: 400,
      iconName: "History",
      labelKey: "nav.mgmt.inventory.movements",
      label: "Goods Movements",
      requires: { domain: "inventory_ops", access: "r" },
    },
    {
      id: "management-inventory-valuation",
      portal: "management",
      path: "/management/inventory/valuation",
      section: "domains",
      order: 400,
      iconName: "Wallet",
      labelKey: "nav.mgmt.inventory.valuation",
      label: "Material Valuation",
      requires: { domain: "inventory", access: "r" },
    },
    // ── Crew sidebar ──────────────────────────────────────────────────
    {
      id: "crew-restock",
      portal: "crew",
      path: "/crew/restock",
      section: "role",
      order: 400,
      iconName: "PackagePlus",
      labelKey: "nav.crew.restock",
      label: "Restock",
      requires: { domain: "inventory_ops", access: "c" },
    },
    {
      id: "crew-restock-queue",
      portal: "crew",
      path: "/crew/logistics/restock-queue",
      section: "role",
      order: 400,
      iconName: "Truck",
      labelKey: "nav.crew.restockQueue",
      label: "Restock Queue",
      requires: { domain: "inventory_ops", access: "c" },
    },
    {
      id: "crew-stock-count",
      portal: "crew",
      path: "/crew/logistics/stock-count",
      section: "role",
      order: 400,
      iconName: "ClipboardList",
      labelKey: "nav.crew.stockCount",
      label: "Stock Count",
      requires: { domain: "inventory_ops", access: "r" },
    },
    {
      id: "crew-disposals",
      portal: "crew",
      path: "/crew/disposals",
      section: "role",
      order: 400,
      iconName: "Trash2",
      labelKey: "nav.crew.disposals",
      label: "Disposals",
      requires: { domain: "inventory_ops", access: "c" },
    },
  ],
} as const;
