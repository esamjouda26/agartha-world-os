import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  DeviceDetailData,
  DeviceDetail,
  HeartbeatEntry,
  MaintenanceOrderEntry,
} from "@/features/devices/types/device-detail";
import type { DeviceStatus, HeartbeatStatus } from "@/features/devices/types/device";

/**
 * RSC query — Device Detail page data.
 *
 * Returns `null` when the device is not found (triggers not-found.tsx).
 * Parallel fetches: device + heartbeats + maintenance orders.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getDeviceDetail = cache(
  async (client: SupabaseClient<Database>, deviceId: string): Promise<DeviceDetailData | null> => {
    // ── Parallel root queries ─────────────────────────────────────────────
    const [deviceResult, heartbeatsResult, ordersResult] = await Promise.all([
      // 1. Device with device_type + zone
      client
        .from("devices")
        .select(
          `id, name, status, serial_number, asset_tag, ip_address, mac_address,
           vlan_id, manufacturer, model, firmware_version, commission_date,
           warranty_expiry, maintenance_vendor_id, created_at, updated_at,
           device_types!devices_device_type_id_fkey ( id, display_name ),
           zones!devices_zone_id_fkey ( id, name )`,
        )
        .eq("id", deviceId)
        .maybeSingle(),

      // 2. Latest 50 heartbeats for this device
      client
        .from("device_heartbeats")
        .select("id, status, response_time_ms, recorded_at")
        .eq("device_id", deviceId)
        .order("recorded_at", { ascending: false })
        .limit(50),

      // 3. Maintenance orders for this device
      client
        .from("maintenance_orders")
        .select(
          `id, status, topology, maintenance_start, maintenance_end, scope, completed_at,
           maintenance_vendors!maintenance_orders_vendor_id_fkey ( name )`,
        )
        .eq("target_ci_id", deviceId)
        .order("maintenance_start", { ascending: false })
        .limit(20),
    ]);

    if (deviceResult.error) throw deviceResult.error;
    if (!deviceResult.data) return null;

    if (heartbeatsResult.error) throw heartbeatsResult.error;
    if (ordersResult.error) throw ordersResult.error;

    const raw = deviceResult.data;

    // Resolve VLAN name separately (FK references vlans.vlan_id, not vlans.id)
    let vlanName: string | null = null;
    if (raw.vlan_id != null) {
      const { data: vlanRow } = await client
        .from("vlans")
        .select("name")
        .eq("vlan_id", raw.vlan_id)
        .maybeSingle();
      vlanName = vlanRow?.name ?? null;
    }

    const dt = raw.device_types as { id: string; display_name: string } | null;
    const zone = raw.zones as { id: string; name: string } | null;

    const device: DeviceDetail = {
      id: raw.id,
      name: raw.name,
      status: (raw.status ?? "offline") as DeviceStatus,
      deviceTypeName: dt?.display_name ?? "Unknown",
      deviceTypeId: dt?.id ?? "",
      serialNumber: raw.serial_number ?? null,
      assetTag: raw.asset_tag ?? null,
      ipAddress: raw.ip_address ? String(raw.ip_address) : null,
      macAddress: raw.mac_address ? String(raw.mac_address) : null,
      vlanId: raw.vlan_id ?? null,
      vlanName,
      zoneName: zone?.name ?? null,
      zoneId: zone?.id ?? null,
      manufacturer: raw.manufacturer ?? null,
      model: raw.model ?? null,
      firmwareVersion: raw.firmware_version ?? null,
      commissionDate: raw.commission_date ?? null,
      warrantyExpiry: raw.warranty_expiry ?? null,
      maintenanceVendorId: raw.maintenance_vendor_id ?? null,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at ?? null,
    };

    const heartbeats: HeartbeatEntry[] = (heartbeatsResult.data ?? []).map((h) => ({
      id: h.id,
      status: (h.status ?? "offline") as HeartbeatStatus,
      responseTimeMs: h.response_time_ms ?? null,
      recordedAt: h.recorded_at ?? new Date().toISOString(),
    }));

    const maintenanceOrders: MaintenanceOrderEntry[] = (ordersResult.data ?? []).map((o) => {
      const vendor = o.maintenance_vendors as { name: string } | null;
      return {
        id: o.id,
        status: o.status ?? "draft",
        topology: o.topology,
        vendorName: vendor?.name ?? "Unknown vendor",
        maintenanceStart: o.maintenance_start,
        maintenanceEnd: o.maintenance_end,
        scope: o.scope ?? null,
        completedAt: o.completed_at ?? null,
      };
    });

    return { device, heartbeats, maintenanceOrders };
  },
);
