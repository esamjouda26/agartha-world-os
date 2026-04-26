/**
 * Operations feature cache invalidation targets — ADR-0006.
 *
 * Router Cache paths for `revalidatePath(path, "page")` after mutations.
 * RLS-scoped reads use React `cache()` only; tags are reserved for future
 * org-wide reads per ADR-0006.
 */

export const OPERATIONS_ROUTER_PATHS = [
  "/[locale]/admin/operations",
  "/[locale]/management/operations/incidents",
  "/[locale]/management/operations/telemetry",
  "/[locale]/management/operations/experiences",
  "/[locale]/management/operations/scheduler",
  "/[locale]/management/operations/vehicles",
] as const;
