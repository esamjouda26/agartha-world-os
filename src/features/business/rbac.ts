import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the Business-admin routes.
 * These routes are gated at Gate 5 (middleware edge) by domain.
 *
 * Note: `/admin/business` is in EXACT_BYPASSES (it's the redirect hub).
 * All deeper business routes need explicit domain gates here.
 */
export const rbac: FeatureRbac = {
  featureId: "business",
  routes: [
    {
      pattern: "/admin/revenue",
      domain: "booking",
      access: "r",
      primaryTables: ["orders", "booking_payments", "order_items", "bookings"],
    },
    {
      pattern: "/admin/guests",
      domain: "reports",
      access: "r",
      primaryTables: ["survey_responses", "bookings"],
    },
    {
      pattern: "/admin/workforce",
      domain: "hr",
      access: "r",
      primaryTables: ["profiles", "staff_records", "v_shift_attendance"],
    },
  ],
} as const;
