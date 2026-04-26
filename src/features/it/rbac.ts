import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC declarations for the IT Infrastructure feature.
 * Consumed ONLY by `src/lib/rbac/middleware-manifest.ts` (Edge bundle).
 *
 * Routes:
 *   /admin/it                              — System Dashboard (exact bypass, no Gate 5)
 *   /admin/devices                         — Device Registry
 *   /admin/devices/:id                     — Device Detail
 *   /admin/system-health                   — System Health Monitoring
 *   /management/maintenance/device-topology — shared <DeviceTopologyPage>
 *     (frontend_spec.md:2740) — gated `it:r`. Lives under the
 *     maintenance route group for sidebar grouping but the gate +
 *     query ownership stay with this IT feature per ADR-0004.
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
    {
      pattern: "/management/maintenance/device-topology",
      domain: "it",
      access: "r",
      primaryTables: ["devices", "device_types", "zones", "locations"],
    },
  ],
} as const;
