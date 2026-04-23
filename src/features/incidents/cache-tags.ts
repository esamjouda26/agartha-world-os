/**
 * Incidents cache invalidation targets — ADR-0006.
 *
 * Every incident-related surface across the three portals is listed here;
 * Server Actions iterate this set calling `revalidatePath(path, "page")`.
 * RLS-scoped reads stay on React `cache()` (attendance-style); no
 * `unstable_cache` / `revalidateTag` usage.
 */
export const INCIDENTS_ROUTER_PATHS = [
  "/[locale]/management/operations/incidents",
  "/[locale]/management/maintenance/incidents",
  "/[locale]/crew/incidents",
] as const;
