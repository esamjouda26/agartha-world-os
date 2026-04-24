/**
 * Business-admin feature cache invalidation targets — ADR-0006.
 * Read-only dashboards — no Server Actions write to these paths today.
 * Listed so future writes can iterate the array.
 */
export const BUSINESS_ROUTER_PATHS = ["/[locale]/admin/business"] as const;
