/**
 * Announcements cache invalidation targets — ADR-0006.
 *
 * Two invalidation surfaces:
 *   (1) The `/announcements` management routes (admin + management only —
 *       crew does not get a sidebar entry; crew reads exclusively via
 *       the topbar bell).
 *   (2) Every staff layout — because the bell badge in the topbar is
 *       resolved by each layout's `rpc_get_unread_announcement_count()`
 *       call. Any write that could change the visible / unread set must
 *       bust the layout so the badge re-reads.
 *
 * RLS-scoped reads (mgmt list of own announcements, bell list of visible
 * announcements) stay on React `cache()` — same rationale as attendance.
 * `unstable_cache` + tag APIs remain reserved.
 */

export const ANNOUNCEMENTS_ROUTER_PATHS = [
  // Management surfaces
  "/[locale]/admin/announcements",
  "/[locale]/management/announcements",
  // Every staff shell — the topbar bell reads unread count in the layout.
  // Revalidating these ensures the badge count refreshes on next nav.
  "/[locale]/admin",
  "/[locale]/management",
  "/[locale]/crew",
] as const;
