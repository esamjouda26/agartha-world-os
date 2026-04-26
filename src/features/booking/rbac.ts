import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC for the booking feature (ADR-0004).
 * `/crew/entry-validation` requires booking:r for lookups; booking:u for check-in.
 * The route is listed with booking:r — booking:u is enforced server-side in the
 * rpc_checkin_booking action. init_schema.sql:5587 — rpc_lookup_booking,
 * init_schema.sql:5608 — rpc_search_bookings_by_email,
 * init_schema.sql:5625 — rpc_checkin_booking.
 */
export const rbac: FeatureRbac = {
  featureId: "booking",
  routes: [
    {
      pattern: "/crew/entry-validation",
      domain: "booking",
      access: "r",
      primaryTables: ["bookings", "booking_attendees"],
    },
  ],
} as const;
