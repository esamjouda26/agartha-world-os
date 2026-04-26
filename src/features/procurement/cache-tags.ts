/**
 * Procurement cache invalidation targets — ADR-0006.
 *
 * Router Cache paths: used with `revalidatePath(path, "page")` after Server
 * Action mutations. RLS-scoped reads cannot go into `unstable_cache` (would
 * require service-role client bypassing RLS — see ADR-0006 rationale).
 *
 * Data Cache tags: reserved for future `unstable_cache`-wrapped org-wide
 * reads (e.g., supplier directory). Not currently in use.
 */

// ── (1) Router Cache paths ────────────────────────────────────────────────

/**
 * Every route that reads procurement data. Server Actions mutating materials,
 * POs, or suppliers must revalidate each of these.
 */
export const PROCUREMENT_ROUTER_PATHS = [
  // Crew
  "/[locale]/crew/logistics/po-receiving",
  // Management — materials
  "/[locale]/management/procurement",
  // Management — purchase orders
  "/[locale]/management/procurement/purchase-orders",
  // Management — reorder dashboard
  "/[locale]/management/procurement/reorder",
  // Management — suppliers
  "/[locale]/management/procurement/suppliers",
  // Cross-domain shared routes — material categories (procurement OR pos:c)
  "/[locale]/management/categories",
  // Cross-domain shared routes — UOM conversions (procurement, pos, system)
  "/[locale]/management/uom",
  // Admin twin for IT-admin (system:c) entry to UOM conversions
  "/[locale]/admin/it/uom",
] as const;

// ── (2) Data Cache tags — reserved for future unstable_cache reads ────────

/**
 * Supplier directory tag. Reserved for an `unstable_cache`-backed read of
 * the suppliers list. Not currently paired with a cached read — do NOT call
 * `revalidateTag` on this until a `unstable_cache`-wrapped read bears this
 * tag (ADR-0006).
 */
export function procurementSuppliersTag(): string {
  return "procurement:suppliers";
}

/**
 * Per-PO tag. Reserved.
 */
export function procurementPoTag(poId: string): string {
  return `procurement:po:${poId}`;
}

/**
 * Per-material tag. Reserved.
 */
export function procurementMaterialTag(materialId: string): string {
  return `procurement:material:${materialId}`;
}
