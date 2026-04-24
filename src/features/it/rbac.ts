import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the IT Infrastructure feature (admin portal).
 * Consumed ONLY by `src/lib/rbac/middleware-manifest.ts` (Edge bundle).
 *
 * Routes:
 *   /admin/it            — System Dashboard (exact bypass, no Gate 5)
 *   /admin/devices       — Device Registry
 *   /admin/devices/:id   — Device Detail
 *   /admin/system-health — System Health Monitoring
 *
 * primaryTables: lists the feature's main table(s) so the
 * `rbac:rls-parity` CI gate can verify RLS alignment.
 */
export const rbac: FeatureRbac = {
  featureId: "it",
  routes: [
    {
      pattern: "/admin/devices",
      domain: "it",
      access: "r",
      primaryTables: ["devices", "device_types", "device_heartbeats"],
    },
    {
      pattern: "/admin/devices/:id",
      domain: "it",
      access: "r",
      primaryTables: ["devices", "device_heartbeats", "maintenance_orders"],
    },
    {
      pattern: "/admin/system-health",
      domain: "it",
      access: "r",
      primaryTables: ["device_heartbeats", "zone_telemetry"],
    },
  ],
} as const;
