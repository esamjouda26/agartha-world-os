/**
 * Inventory Operations cache invalidation targets — ADR-0006.
 *
 * Router Cache paths: used with `revalidatePath(path, "page")` after Server
 * Action mutations to force the RSC payload to re-render on next navigation.
 * RLS-scoped reads live here because they cannot go into `unstable_cache`'s
 * Data Cache without sacrificing RLS (see ADR-0006 rationale).
 *
 * Data Cache tags: reserved for future `unstable_cache`-wrapped org-wide
 * reads (e.g., materials catalogue, location directory) that are not
 * RLS-scoped per-user. Not currently in use — helpers are exported so future
 * phases can tag consistently without drift.
 */

// ── (1) Router Cache paths ────────────────────────────────────────────────

/**
 * Every route that reads inventory-ops data for the caller. Server Actions
 * mutating requisitions, reconciliations, or write-offs must revalidate each
 * of these so any currently-visible tree re-renders on next navigation.
 */
export const INVENTORY_ROUTER_PATHS = [
  // ── Crew ──
  "/[locale]/crew/restock",
  "/[locale]/crew/logistics/restock-queue",
  "/[locale]/crew/logistics/stock-count",
  "/[locale]/crew/disposals",
  // ── Management — must mirror frontend_spec.md §3d so every Server Action
  //               that mutates inventory data revalidates every visible
  //               surface. /management/categories and /management/uom are
  //               procurement-owned (see procurement/cache-tags.ts) — not
  //               listed here. Revalidating an unmatched dynamic route is
  //               a no-op per Next.js docs.
  "/[locale]/management/inventory",
  "/[locale]/management/inventory/requisitions",
  "/[locale]/management/inventory/reconciliation",
  "/[locale]/management/inventory/write-offs",
  "/[locale]/management/inventory/equipment",
  "/[locale]/management/inventory/movements",
  "/[locale]/management/inventory/valuation",
] as const;

// ── (2) Data Cache tags — reserved for future unstable_cache reads ────────

/**
 * Materials catalogue tag. Reserved for an `unstable_cache`-backed service-
 * role read of the materials list (non-RLS-scoped). Not currently paired
 * with any cached read — do NOT call `revalidateTag` on this until a
 * `unstable_cache`-wrapped read bears this tag (ADR-0006).
 */
export function inventoryMaterialsTag(): string {
  return "inventory:materials";
}

/**
 * Location catalogue tag. Reserved.
 */
export function inventoryLocationsTag(): string {
  return "inventory:locations";
}

/**
 * Per-user requisition tag. Reserved.
 */
export function inventoryRequisitionUserTag(userId: string): string {
  return `inventory:requisitions:${userId}`;
}

/**
 * Per-user reconciliation tag. Reserved.
 */
export function inventoryReconciliationUserTag(userId: string): string {
  return `inventory:reconciliations:${userId}`;
}
