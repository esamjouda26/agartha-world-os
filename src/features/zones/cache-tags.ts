/**
 * Zones feature cache invalidation targets — ADR-0006.
 * Paths for `revalidatePath(path, "page")` after mutations.
 */

export const ZONES_ROUTER_PATHS = ["/[locale]/admin/zones"] as const;
