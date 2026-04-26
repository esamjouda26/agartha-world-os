/**
 * Marketing feature cache invalidation targets — ADR-0006.
 *
 * Router Cache paths for `revalidatePath(path, "page")` after Server Action
 * mutations. RLS-scoped reads use React `cache()` only; tags are reserved
 * for future org-wide reads (ADR-0006).
 */
export const MARKETING_ROUTER_PATHS = [
  "/[locale]/crew/feedback",
  "/[locale]/management/marketing/campaigns",
  "/[locale]/management/marketing/promos",
  "/[locale]/management/marketing/surveys",
] as const;

/**
 * Per-user survey tag. Reserved for a future `unstable_cache`-wrapped
 * read — do NOT call `revalidateTag` on this until paired (ADR-0006).
 */
export function surveyResponseTag(userId: string): string {
  return `marketing:survey:${userId}`;
}
