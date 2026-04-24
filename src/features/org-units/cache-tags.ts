/**
 * Org-units feature cache invalidation targets — ADR-0006.
 */
export const ORG_UNITS_ROUTER_PATHS = [
  "/[locale]/admin/org-units",
  // org_unit changes propagate through RLS, so bust the zones page too
  "/[locale]/admin/zones",
] as const;
