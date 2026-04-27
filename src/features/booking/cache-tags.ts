/**
 * Booking cache invalidation targets — ADR-0006.
 *
 * Includes entry-validation (staff check-in) plus the guest /my-booking/manage
 * subtree (Phase 9a Routes 5-7). Reschedule + attendee-edit + biometric
 * actions iterate this list calling revalidatePath(path, "page").
 */
export const BOOKING_ROUTER_PATHS = [
  "/[locale]/crew/entry-validation",
  "/[locale]/my-booking/manage",
  "/[locale]/my-booking/manage/biometrics",
  "/[locale]/my-booking/manage/memories",
] as const;

export function bookingTag(bookingId: string): string {
  return `booking:${bookingId}`;
}
