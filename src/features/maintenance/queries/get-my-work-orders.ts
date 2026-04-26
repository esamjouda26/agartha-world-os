import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { WorkOrderView } from "@/features/maintenance/types";

/**
 * Fetch work orders where the caller is the sponsor (maintenance:c Tier 3b).
 * Filter: sponsor_id = own staff_record_id AND status IN ('scheduled','active').
 * init_schema.sql:3573 — maintenance_orders table.
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getMyWorkOrders = cache(
  async (client: SupabaseClient<Database>, userId: string): Promise<ReadonlyArray<WorkOrderView>> => {
    const { data: profile } = await client
      .from("profiles")
      .select("staff_record_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.staff_record_id) return [];

    // devices.zone_id → zones.name (devices have no direct FK to locations).
    // init_schema.sql:3573 — maintenance_orders; init_schema.sql:1091 — zones.
    const { data, error } = await client
      .from("maintenance_orders")
      .select(
        "id, topology, status, vendor_id, maintenance_start, maintenance_end, mad_limit_minutes, sponsor_id, vendor_mac_address, authorized_at, completed_at, maintenance_vendors(name), devices(name, zones(name))",
      )
      .eq("sponsor_id", profile.staff_record_id)
      .in("status", ["scheduled", "active"])
      .order("maintenance_start", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((o): WorkOrderView => {
      const vendor = o.maintenance_vendors as { name: string } | null;
      const device = o.devices as { name: string; zones: { name: string } | null } | null;
      return {
        id: o.id,
        topology: o.topology,
        status: o.status,
        vendorId: o.vendor_id,
        vendorName: vendor?.name ?? "—",
        deviceId: o.id,
        deviceName: device?.name ?? "—",
        deviceLocation: device?.zones?.name ?? null,
        maintenanceStart: o.maintenance_start,
        maintenanceEnd: o.maintenance_end,
        madLimitMinutes: o.mad_limit_minutes,
        sponsorId: o.sponsor_id,
        // vendor_mac_address is MACADDR in PG — generated as `unknown`; cast to string for display.
        vendorMacAddress: (o.vendor_mac_address as string | null),
        authorizedAt: o.authorized_at,
        completedAt: o.completed_at,
      };
    });
  },
);
