import type { FeatureRbac } from "@/lib/rbac/types";

export const rbac: FeatureRbac = {
  featureId: "guests",
  routes: [
    {
      pattern: "/admin/guests",
      domain: "reports",
      access: "r",
      primaryTables: ["survey_responses", "bookings", "experiences"],
    },
  ],
} as const;
