import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the Operations feature — ADR-0004.
 *
 * Experience Config and Scheduler require `booking:c`, not `ops:c`.
 * Both live under `/operations` because operations_manager owns
 * both `ops` and `booking` domains.
 */
export const rbac: FeatureRbac = {
  featureId: "operations",
  routes: [
    {
      pattern: "/admin/operations",
      domain: "ops",
      access: "r",
      primaryTables: ["zone_telemetry", "zones", "incidents", "maintenance_orders"],
    },
    {
      pattern: "/management/operations/incidents",
      domain: "ops",
      access: "c",
      primaryTables: ["incidents"],
    },
    {
      pattern: "/management/operations/telemetry",
      domain: "ops",
      access: "r",
      primaryTables: ["zones", "zone_telemetry", "crew_zones"],
    },
    {
      pattern: "/management/operations/experiences",
      domain: "booking",
      access: "c",
      primaryTables: ["experiences", "tiers", "tier_perks", "experience_tiers", "scheduler_config"],
    },
    {
      pattern: "/management/operations/scheduler",
      domain: "booking",
      access: "r",
      primaryTables: ["time_slots", "bookings", "experiences"],
    },
    {
      pattern: "/management/operations/vehicles",
      domain: "ops",
      access: "c",
      primaryTables: ["vehicles"],
    },
  ],
} as const;
