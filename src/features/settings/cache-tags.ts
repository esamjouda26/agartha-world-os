/**
 * Settings cache invalidation targets — ADR-0006.
 *
 * RLS-scoped reads (`profiles` WHERE `id = auth.uid()`) are wrapped in React
 * `cache()` — request-scoped dedup only. Server Actions (display_name update,
 * avatar update) invalidate the Router Cache via `revalidatePath(path, "page")`
 * iterating this array, so every portal wrapper rehydrates its RSC payload
 * on next navigation.
 *
 * `unstable_cache` + tags are NOT used here. The settings read depends on
 * `auth.uid()` and cannot be detached from request context without forcing
 * a service-role bypass of RLS (see ADR-0006 rationale).
 *
 * Path shape: `/[locale]/<portal>/settings` (Next 16 dynamic-segment syntax).
 * Next invalidates every concrete locale on a single call.
 */
export const SETTINGS_ROUTER_PATHS = [
  "/[locale]/admin/settings",
  "/[locale]/management/settings",
  "/[locale]/crew/settings",
] as const;
