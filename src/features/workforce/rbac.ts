import type { FeatureRbac } from "@/lib/rbac/types";

export const rbac: FeatureRbac = {
  featureId: "workforce",
  routes: [
    {
      pattern: "/admin/workforce",
      domain: "hr",
      access: "r",
      primaryTables: ["profiles", "staff_records", "v_shift_attendance", "attendance_exceptions"],
    },
  ],
} as const;
