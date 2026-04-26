/**
 * HR feature cache invalidation targets — ADR-0006.
 *
 * Router Cache paths for `revalidatePath(path, "page")` after mutations.
 * RLS-scoped reads use React `cache()` only; tags are reserved for future
 * org-wide reads per ADR-0006.
 */

export const HR_ROUTER_PATHS = [
  "/[locale]/management/hr",
  "/[locale]/management/hr/shifts",
  "/[locale]/management/hr/attendance/ledger",
  "/[locale]/management/hr/attendance/leaves",
  "/[locale]/management/hr/attendance/queue",
  // Crew schedule
  "/[locale]/crew/schedule",
  // Shared leave routes (all portals)
  "/[locale]/crew/leave",
  "/[locale]/management/leave",
  "/[locale]/admin/leave",
] as const;

// ── Reserved Data Cache tags (not yet used) ────────────────────────────

export function hrStaffTag(staffId: string): string {
  return `hr:staff:${staffId}`;
}

export function hrShiftsTag(): string {
  return "hr:shifts";
}

export function hrRosterTemplatesTag(): string {
  return "hr:roster-templates";
}
