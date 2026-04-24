import "server-only";

import { cache } from "react";

import { subHours, addDays, isBefore, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import type {
  DeviceListData,
  DeviceRow,
  DeviceStatus,
  HeartbeatStatus,
} from "@/features/devices/types/device";

/**
 * RSC query — Device Registry list + KPIs.
 *
 * Fetches all devices with joined device_type, zone, and vlan names;
 * resolves the latest heartbeat per device in JS (Supabase JS cannot
 * express DISTINCT ON); computes KPI aggregates in parallel.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * RLS-scoped reads cannot use `unstable_cache`.
 */
export const getDeviceList = cache(
  async (client: SupabaseClient<Database>): Promise<DeviceListData> => {
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30).toISOString().split("T")[0]!;
    const todayIso = now.toISOString().split("T")[0]!;
    const yesterday = subHours(now, 24).toISOString();

    // ── Parallel root queries ─────────────────────────────────────────────
    const [
      devicesResult,
      heartbeatsResult,
      activeWoResult,
      rtResult,
      typesResult,
      zonesResult,
      vendorsResult,
      vlansResult,
    ] = await Promise.all([
      // 1. Devices with device_type + zone + vlan
      client
        .from("devices")
        .select(
          `id, name, status, serial_number, asset_tag, ip_address, mac_address,
             warranty_expiry, vlan_id, zone_id,
             device_types!devices_device_type_id_fkey ( id, display_name ),
             zones!devices_zone_id_fkey ( id, name )`,
        )
        .order("name", { ascending: true }),

      // 2. All heartbeats ordered by device_id + recorded_at DESC
      // We'll take the latest per device in JS
      client
        .from("device_heartbeats")
        .select("device_id, status, response_time_ms, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(5000),

      // 3. Distinct device IDs under active/scheduled maintenance orders
      client
        .from("maintenance_orders")
        .select("target_ci_id")
        .in("status", ["scheduled", "active"]),

      // 4. Avg response time over last 24h
      client
        .from("device_heartbeats")
        .select("response_time_ms")
        .gte("recorded_at", yesterday)
        .not("response_time_ms", "is", null),

      // 5. Device types for dropdowns
      client
        .from("device_types")
        .select("id, name, display_name")
        .order("display_name", { ascending: true }),

      // 6. Zones for form dropdown
      client
        .from("zones")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),

      // 7. Maintenance vendors for form dropdown
      client
        .from("maintenance_vendors")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),

      // 8. VLANs for form dropdown
      client.from("vlans").select("vlan_id, name").order("vlan_id", { ascending: true }),
    ]);

    if (devicesResult.error) throw devicesResult.error;
    if (heartbeatsResult.error) throw heartbeatsResult.error;
    if (activeWoResult.error) throw activeWoResult.error;
    if (rtResult.error) throw rtResult.error;
    if (typesResult.error) throw typesResult.error;
    if (zonesResult.error) throw zonesResult.error;
    if (vendorsResult.error) throw vendorsResult.error;
    if (vlansResult.error) throw vlansResult.error;

    // ── Resolve latest heartbeat per device ───────────────────────────────
    const latestHeartbeat = new Map<
      string,
      { status: HeartbeatStatus; recordedAt: string; responseTimeMs: number | null }
    >();
    for (const h of heartbeatsResult.data ?? []) {
      // Array is DESC by recorded_at → first occurrence per device is latest
      if (!latestHeartbeat.has(h.device_id)) {
        latestHeartbeat.set(h.device_id, {
          status: (h.status ?? "offline") as HeartbeatStatus,
          recordedAt: h.recorded_at ?? now.toISOString(),
          responseTimeMs: h.response_time_ms ?? null,
        });
      }
    }

    // ── VLAN name lookup ──────────────────────────────────────────────────
    const vlanNameMap = new Map<number, string>();
    for (const v of vlansResult.data ?? []) {
      vlanNameMap.set(v.vlan_id, v.name);
    }

    // ── Map devices to view model ─────────────────────────────────────────
    const statusCounts: Record<string, number> = {};
    const devices: DeviceRow[] = (devicesResult.data ?? []).map((d) => {
      const rawStatus = (d.status ?? "offline") as DeviceStatus;
      statusCounts[rawStatus] = (statusCounts[rawStatus] ?? 0) + 1;

      const hb = latestHeartbeat.get(d.id) ?? null;
      // device_types and zones are FK join objects
      const dt = d.device_types as { id: string; display_name: string } | null;
      const zone = d.zones as { id: string; name: string } | null;

      return {
        id: d.id,
        name: d.name,
        deviceTypeName: dt?.display_name ?? "Unknown",
        deviceTypeId: dt?.id ?? "",
        status: rawStatus,
        zoneName: zone?.name ?? null,
        zoneId: zone?.id ?? null,
        lastHeartbeatAt: hb?.recordedAt ?? null,
        heartbeatStatus: hb?.status ?? null,
        warrantyExpiry: d.warranty_expiry ?? null,
        serialNumber: d.serial_number ?? null,
        assetTag: d.asset_tag ?? null,
        ipAddress: d.ip_address ? String(d.ip_address) : null,
        macAddress: d.mac_address ? String(d.mac_address) : null,
        vlanId: d.vlan_id ?? null,
        vlanName: d.vlan_id != null ? (vlanNameMap.get(d.vlan_id) ?? null) : null,
      };
    });

    // ── KPIs ──────────────────────────────────────────────────────────────

    // Stale heartbeat: device whose latest heartbeat is older than 1h OR never pinged
    let staleHeartbeatCount = 0;
    for (const d of devices) {
      const isStale =
        d.lastHeartbeatAt === null || isBefore(parseISO(d.lastHeartbeatAt), subHours(now, 1));
      if (isStale) staleHeartbeatCount++;
    }

    // Warranty expiring ≤ 30d from today (and not already expired)
    let warrantyExpiringSoonCount = 0;
    for (const d of devices) {
      if (
        d.warrantyExpiry != null &&
        d.warrantyExpiry >= todayIso &&
        d.warrantyExpiry <= thirtyDaysFromNow
      ) {
        warrantyExpiringSoonCount++;
      }
    }

    // Under active work order: distinct device IDs
    const activeWoDeviceIds = new Set((activeWoResult.data ?? []).map((r) => r.target_ci_id));
    const underActiveWorkOrderCount = activeWoDeviceIds.size;

    // Avg response time last 24h
    const rtValues = (rtResult.data ?? [])
      .map((r) => r.response_time_ms)
      .filter((v): v is number => v != null);
    const avgResponseTimeMs =
      rtValues.length > 0
        ? Math.round(rtValues.reduce((s, v) => s + v, 0) / rtValues.length)
        : null;

    return {
      devices,
      kpis: {
        staleHeartbeatCount,
        warrantyExpiringSoonCount,
        underActiveWorkOrderCount,
        avgResponseTimeMs,
      },
      statusCounts,
      deviceTypes: (typesResult.data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        displayName: t.display_name,
      })),
      zones: (zonesResult.data ?? []).map((z) => ({
        id: z.id,
        name: z.name,
      })),
      vendors: (vendorsResult.data ?? []).map((v) => ({
        id: v.id,
        name: v.name,
      })),
      vlans: (vlansResult.data ?? []).map((v) => ({
        vlanId: v.vlan_id,
        name: v.name,
      })),
    };
  },
);
