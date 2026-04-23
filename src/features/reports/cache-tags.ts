/**
 * Reports cache invalidation targets — ADR-0006.
 *
 * Every mutation (save/update/delete schedule, generate) revalidates
 * these Router Cache paths so the config list + execution history
 * re-render on next navigation.
 */
export const REPORTS_ROUTER_PATHS = [
  "/[locale]/admin/reports",
  "/[locale]/management/reports",
] as const;
