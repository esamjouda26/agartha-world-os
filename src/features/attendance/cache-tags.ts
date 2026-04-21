/**
 * Attendance cache invalidation targets — ADR-0006.
 *
 * Two distinct mechanisms:
 *
 *   (1) Router Cache paths — used with `revalidatePath(path, "page")` after
 *       Server Action mutations to force the RSC payload to re-render on
 *       next navigation. RLS-scoped reads (almost everything here) live in
 *       this lane because they can't go into `unstable_cache`'s Data Cache
 *       without sacrificing RLS (see ADR-0006 rationale).
 *
 *   (2) Data Cache tags — reserved for future `unstable_cache`-wrapped
 *       org-wide reads that aren't RLS-scoped per-user (e.g., location
 *       list, role directory). None of the current attendance reads use
 *       this lane. Helpers stay exported so consumers of later phases can
 *       tag consistently.
 *
 * Path shape: `/[locale]/crew/attendance` (Next 16 dynamic-segment syntax).
 * Next invalidates every concrete locale on a single call.
 */

// ── (1) Router Cache paths ─────────────────────────────────────────────

/**
 * Every route that reads attendance data for the caller. A Server Action
 * mutating attendance state must revalidate each of these so any currently-
 * visible tree that depends on the mutated rows re-renders on navigation.
 *
 * Add entries here as Phase 5 introduces admin/management wrappers that
 * consume the shared `AttendancePage` component.
 */
export const ATTENDANCE_ROUTER_PATHS = [
  "/[locale]/crew/attendance",
  // HR surfaces land in Phase 7 per ADR-0007 — the paths exist in the
  // invalidation set already so mutation actions bust them the moment
  // the routes are scaffolded. Revalidating a not-yet-matched dynamic
  // route is a no-op, so it's safe to list them early.
  "/[locale]/management/hr/attendance/queue",
  "/[locale]/management/hr/attendance/ledger",
] as const;

// ── (2) Data Cache tags — reserved for future unstable_cache reads ─────

/**
 * User-wide attendance tag. Reserved for `unstable_cache`-backed reads that
 * don't depend on RLS (e.g., public calendar feeds generated via
 * service-role). Not currently in use.
 */
export function hrAttendanceUserTag(userId: string): string {
  return `hr:attendance:${userId}`;
}

/**
 * User + shift-date tag. Reserved.
 */
export function hrAttendanceDayTag(userId: string, shiftDate: string): string {
  return `hr:attendance:${userId}:${shiftDate}`;
}

/**
 * User + month tag. Reserved.
 */
export function hrAttendanceMonthTag(userId: string, monthIso: string): string {
  const yyyyMM = monthIso.slice(0, 7);
  return `hr:attendance:${userId}:month:${yyyyMM}`;
}

/**
 * User exception tag. Reserved.
 */
export function hrExceptionsUserTag(userId: string): string {
  return `hr:exceptions:${userId}`;
}
