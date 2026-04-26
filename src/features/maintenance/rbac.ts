import type { FeatureRbac } from "@/lib/rbac/types";

/**
 * RBAC for the maintenance feature (ADR-0004).
 *
 * Crew sponsor surface (`/crew/maintenance/orders`) is `maintenance:c`.
 * Tier 3b RLS narrows reads to rows where `sponsor_id = own staff_record_id`.
 *
 * Management surfaces:
 *   - `/management/maintenance/orders`  — full WO lifecycle (maintenance:c).
 *     Manager seed (init_schema.sql:737) holds maintenance:crud, so
 *     Tier-3b RLS returns every row.
 *   - `/management/maintenance/vendors` — vendor registry CRUD (maintenance:c).
 *
 * `/management/maintenance/device-topology` is owned by the IT feature
 * (`/admin/devices/*`) — registered in `src/features/devices/rbac.ts` so
 * both `/admin/devices/topology` and `/management/maintenance/device-
 * topology` resolve to the same shared component without duplicating
 * the gate definition.
 *
 * `/management/maintenance/incidents` is registered in
 * `src/features/incidents/rbac.ts` (shared `IncidentLogPage` consumer).
 *
 * init_schema.sql:3573 — maintenance_orders;
 * init_schema.sql:3555 — maintenance_vendors.
 */
export const rbac: FeatureRbac = {
  featureId: "maintenance",
  routes: [
    {
      pattern: "/crew/maintenance/orders",
      domain: "maintenance",
      access: "c",
      primaryTables: ["maintenance_orders"],
    },
    {
      pattern: "/management/maintenance/orders",
      domain: "maintenance",
      access: "c",
      primaryTables: ["maintenance_orders"],
    },
    {
      pattern: "/management/maintenance/vendors",
      domain: "maintenance",
      access: "c",
      primaryTables: ["maintenance_vendors"],
    },
  ],
} as const;
