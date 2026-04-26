/**
 * Booking cache invalidation targets — ADR-0006.
 * Entry-validation mutations (check-in) update booking status.
 */
export const BOOKING_ROUTER_PATHS = [
  "/[locale]/crew/entry-validation",
] as const;

export function bookingTag(bookingId: string): string {
  return `booking:${bookingId}`;
}
