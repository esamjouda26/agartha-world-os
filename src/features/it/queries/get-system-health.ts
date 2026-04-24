import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { HeartbeatStatus, DeviceStatus } from "@/features/devices/types/device";

/**
 * Device heartbeat row for the system-health page.
 * Latest heartbeat per device, resolved with device name + type.
 */
export type HealthHeartbeatRow = Readonly<{
  deviceId: string;
  deviceName: string;
  deviceTypeName: string;
  deviceStatus: DeviceStatus;
  heartbeatStatus: HeartbeatStatus | null;
  responseTimeMs: number | null;
  lastHeartbeatAt: string | null;
}>;

export type ZoneTelemetryRow = Readonly<{
  zoneId: string;
  zoneName: string;
  currentOccupancy: number | null;
  temperature: number | null;
  humidity: number | null;
  co2Level: number | null;
  recordedAt: string | null;
}>;

export type SystemHealthKpis = Readonly<{
  totalDevices: number;
  online: number;
  offline: number;
  degraded: number;
  neverPinged: number;
  zonesCovered: number;
  totalZones: number;
}>;

export type SystemHealthData = Readonly<{
  kpis: SystemHealthKpis;
  heartbeats: ReadonlyArray<HealthHeartbeatRow>;
  zoneTelemetry: ReadonlyArray<ZoneTelemetryRow>;
}>;

/**
 * RSC query — system health monitoring page data.
 * Fetches latest heartbeat per device + latest telemetry per zone.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getSystemHealth = cache(
  async (client: SupabaseClient<Database>): Promise<SystemHealthData> => {
    const [devicesResult, heartbeatsResult, zonesResult, telemetryResult] = await Promise.all([
      client
        .from("devices")
        .select("id, name, status, device_types!devices_device_type_id_fkey ( display_name )"),

      client
        .from("device_heartbeats")
        .select("device_id, status, response_time_ms, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(5000),

      client.from("zones").select("id, name").eq("is_active", true),

      client
        .from("zone_telemetry")
        .select("zone_id, current_occupancy, temperature, humidity, co2_level, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(2000),
    ]);

    if (devicesResult.error) throw devicesResult.error;
    if (heartbeatsResult.error) throw heartbeatsResult.error;
    if (zonesResult.error) throw zonesResult.error;
    if (telemetryResult.error) throw telemetryResult.error;

    // ── Latest heartbeat per device ─────────────────────────────────────
    const latestHb = new Map<
      string,
      { status: HeartbeatStatus; responseTimeMs: number | null; recordedAt: string }
    >();
    for (const h of heartbeatsResult.data ?? []) {
      if (!latestHb.has(h.device_id)) {
        latestHb.set(h.device_id, {
          status: (h.status ?? "offline") as HeartbeatStatus,
          responseTimeMs: h.response_time_ms ?? null,
          recordedAt: h.recorded_at ?? new Date().toISOString(),
        });
      }
    }

    // ── Build heartbeat rows ─────────────────────────────────────────────
    const heartbeats: HealthHeartbeatRow[] = (devicesResult.data ?? []).map((d) => {
      const dt = d.device_types as { display_name: string } | null;
      const hb = latestHb.get(d.id) ?? null;
      return {
        deviceId: d.id,
        deviceName: d.name,
        deviceTypeName: dt?.display_name ?? "Unknown",
        deviceStatus: (d.status ?? "offline") as DeviceStatus,
        heartbeatStatus: hb?.status ?? null,
        responseTimeMs: hb?.responseTimeMs ?? null,
        lastHeartbeatAt: hb?.recordedAt ?? null,
      };
    });

    // ── KPIs ──────────────────────────────────────────────────────────────
    let online = 0;
    let offline = 0;
    let degraded = 0;
    let neverPinged = 0;
    for (const h of heartbeats) {
      if (h.heartbeatStatus === null) neverPinged++;
      else if (h.heartbeatStatus === "online") online++;
      else if (h.heartbeatStatus === "offline") offline++;
      else if (h.heartbeatStatus === "degraded") degraded++;
    }

    // ── Latest telemetry per zone ────────────────────────────────────────
    const latestTelemetry = new Map<
      string,
      {
        currentOccupancy: number | null;
        temperature: number | null;
        humidity: number | null;
        co2Level: number | null;
        recordedAt: string | null;
      }
    >();
    for (const t of telemetryResult.data ?? []) {
      if (!latestTelemetry.has(t.zone_id)) {
        latestTelemetry.set(t.zone_id, {
          currentOccupancy: t.current_occupancy ?? null,
          temperature: t.temperature != null ? Number(t.temperature) : null,
          humidity: t.humidity != null ? Number(t.humidity) : null,
          co2Level: t.co2_level != null ? Number(t.co2_level) : null,
          recordedAt: t.recorded_at ?? null,
        });
      }
    }

    const zoneTelemetry: ZoneTelemetryRow[] = (zonesResult.data ?? []).map((z) => {
      const t = latestTelemetry.get(z.id) ?? null;
      return {
        zoneId: z.id,
        zoneName: z.name,
        currentOccupancy: t?.currentOccupancy ?? null,
        temperature: t?.temperature ?? null,
        humidity: t?.humidity ?? null,
        co2Level: t?.co2Level ?? null,
        recordedAt: t?.recordedAt ?? null,
      };
    });

    const zonesCovered = [...latestTelemetry.keys()].filter((id) =>
      (zonesResult.data ?? []).some((z) => z.id === id),
    ).length;

    return {
      kpis: {
        totalDevices: heartbeats.length,
        online,
        offline,
        degraded,
        neverPinged,
        zonesCovered,
        totalZones: zonesResult.data?.length ?? 0,
      },
      heartbeats: heartbeats.sort((a, b) => {
        // Sort: degraded → offline → never-pinged → online
        const rank = (h: HealthHeartbeatRow) => {
          if (h.heartbeatStatus === "degraded") return 0;
          if (h.heartbeatStatus === "offline") return 1;
          if (h.heartbeatStatus === null) return 2;
          return 3;
        };
        return rank(a) - rank(b);
      }),
      zoneTelemetry,
    };
  },
);
