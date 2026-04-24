/**
 * IAM cache invalidation targets — ADR-0006.
 *
 * Router Cache paths for `revalidatePath(path, "page")` after mutations.
 */

export const IAM_ROUTER_PATHS = ["/[locale]/admin/iam", "/[locale]/admin/it"] as const;

// ── Data Cache tags — reserved for future unstable_cache reads ─────

export function iamRequestTag(requestId: string): string {
  return `iam:requests:${requestId}`;
}

export const IAM_REQUESTS_TAG = "iam:requests" as const;
