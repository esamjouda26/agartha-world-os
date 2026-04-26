import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  DeviceStatus,
  TopologyData,
  TopologyDevice,
  TopologyLocation,
} from "@/features/devices/types/topology";

/**
 * RSC payload for the device-topology surface
 * (frontend_spec.md:2740-2775). Hierarchical tree by `parent_device_id`
 * grouped by location (devices.zone_id → zones.location_id → locations).
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup.
 *
 * Joins (PostgREST embedded):
 *   - device_types (display_name)
 *   - zones (name, location_id) → locations (name)
 *   - vlans (name)
 *   - maintenance_vendors (name)
 *
 * Per-device open WO count is computed in JS over a single
 * `maintenance_orders` projection — avoids N+1 sub-queries.
 *
 * Per CLAUDE.md §10 the manager-portal route is gated `it:r`. The IT
 * domain holds read access to `devices`/`device_types`/`zones`/
 * `locations`/`vlans`/`maintenance_orders` via Tier-1/Tier-2 RLS, so
 * no SECURITY DEFINER bypass is needed.
 */
export const getDeviceTopology = cache(
  async (client: SupabaseClient<Database>): Promise<TopologyData> => {
    const [devicesRes, locationsRes, ordersRes] = await Promise.all([
      client
        .from("devices")
        .select(
          `
          id,
          name,
          status,
          parent_device_id,
          zone_id,
          ip_address,
          mac_address,
          firmware_version,
          serial_number,
          asset_tag,
          manufacturer,
          model,
          commission_date,
          warranty_expiry,
          device_types ( display_name ),
          zones ( id, name, location_id, locations ( id, name ) ),
          vlans ( name ),
          maintenance_vendors ( name )
          `,
        )
        .order("name", { ascending: true }),
      client
        .from("locations")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      // Just enough to count open WOs per device.
      client
        .from("maintenance_orders")
        .select("target_ci_id, status")
        .in("status", ["draft", "scheduled", "active"]),
    ]);
    if (devicesRes.error) throw devicesRes.error;
    if (locationsRes.error) throw locationsRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const openWoByDevice = new Map<string, number>();
    for (const o of ordersRes.data ?? []) {
      if (!o.target_ci_id) continue;
      openWoByDevice.set(
        o.target_ci_id,
        (openWoByDevice.get(o.target_ci_id) ?? 0) + 1,
      );
    }

    const devices: TopologyDevice[] = (devicesRes.data ?? []).map((d) => {
      const dt = d.device_types as { display_name: string } | null;
      const zone = d.zones as
        | {
            id: string;
            name: string;
            location_id: string | null;
            locations: { id: string; name: string } | null;
          }
        | null;
      const vlan = d.vlans as { name: string } | null;
      const vendor = d.maintenance_vendors as { name: string } | null;
      return {
        id: d.id,
        name: d.name,
        status: (d.status ?? "offline") as DeviceStatus,
        deviceTypeName: dt?.display_name ?? null,
        parentDeviceId: d.parent_device_id,
        zoneId: zone?.id ?? null,
        zoneName: zone?.name ?? null,
        locationId: zone?.locations?.id ?? null,
        locationName: zone?.locations?.name ?? null,
        // INET / MACADDR generate as `unknown` in supabase-typed rows.
        ipAddress: (d.ip_address as string | null) ?? null,
        macAddress: (d.mac_address as string | null) ?? null,
        firmwareVersion: d.firmware_version,
        serialNumber: d.serial_number,
        assetTag: d.asset_tag,
        manufacturer: d.manufacturer,
        model: d.model,
        commissionDate: d.commission_date,
        warrantyExpiry: d.warranty_expiry,
        vlanName: vlan?.name ?? null,
        vendorName: vendor?.name ?? null,
        openWoCount: openWoByDevice.get(d.id) ?? 0,
      };
    });

    // Aggregate per-location health counts. Devices missing a zone are
    // treated as "Unassigned".
    const locationAccumulator = new Map<
      string,
      { total: number; online: number; offline: number; maintenance: number }
    >();
    for (const d of devices) {
      const key = d.locationId ?? "__unassigned__";
      const acc = locationAccumulator.get(key) ?? {
        total: 0,
        online: 0,
        offline: 0,
        maintenance: 0,
      };
      acc.total += 1;
      if (d.status === "online") acc.online += 1;
      else if (d.status === "offline") acc.offline += 1;
      else if (d.status === "maintenance") acc.maintenance += 1;
      locationAccumulator.set(key, acc);
    }

    const locations: TopologyLocation[] = [];
    for (const loc of locationsRes.data ?? []) {
      const acc = locationAccumulator.get(loc.id);
      if (!acc) continue; // Skip locations with zero devices.
      locations.push({
        id: loc.id,
        name: loc.name,
        totalCount: acc.total,
        onlineCount: acc.online,
        offlineCount: acc.offline,
        maintenanceCount: acc.maintenance,
      });
    }
    const unassigned = locationAccumulator.get("__unassigned__");
    if (unassigned) {
      locations.push({
        id: "__unassigned__",
        name: "Unassigned",
        totalCount: unassigned.total,
        onlineCount: unassigned.online,
        offlineCount: unassigned.offline,
        maintenanceCount: unassigned.maintenance,
      });
    }

    return { devices, locations };
  },
);
