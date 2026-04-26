/**
 * POS cache invalidation targets — ADR-0006.
 *
 * RLS-scoped reads use React cache() only; Server Actions invalidate
 * via revalidatePath(path, "page") targeting the routes below.
 * revalidatePath("/", "layout") is FORBIDDEN.
 * revalidateTag / updateTag are RESERVED — no paired unstable_cache today.
 */

// ── (1) Router Cache paths ──────────────────────────────────────────────

export const POS_ROUTER_PATHS = [
  "/[locale]/crew/pos",
  "/[locale]/crew/active-orders",
  // Management POS routes — Phase 7
  "/[locale]/management/pos",
  "/[locale]/management/pos/orders",
  "/[locale]/management/pos/price-lists",
  "/[locale]/management/pos/bom",
] as const;

/** Dynamic paths for [id] routes — called with the resolved id. */
export function posPosPointDetailPath(id: string): string {
  return `/[locale]/management/pos/${id}`;
}
export function posPosPointModifiersPath(id: string): string {
  return `/[locale]/management/pos/${id}/modifiers`;
}
export function posPriceListDetailPath(id: string): string {
  return `/[locale]/management/pos/price-lists/${id}`;
}
export function posBomDetailPath(id: string): string {
  return `/[locale]/management/pos/bom/${id}`;
}

// ── (2) Data Cache tags — reserved for future unstable_cache reads ─────

export function posOrderTag(orderId: string): string {
  return `pos:order:${orderId}`;
}

export function posPosPointTag(posPointId: string): string {
  return `pos:point:${posPointId}`;
}
