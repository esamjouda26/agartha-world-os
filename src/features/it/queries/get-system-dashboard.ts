import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Result shape for the IT System Dashboard. All fields are derived from
 * aggregate queries — no raw rows leak to the client leaf.
 *
 * Cache model (ADR-0006): React `cache()` only — request-scoped dedup.
 * RLS-scoped reads cannot use `unstable_cache`.
 */
export type SystemDashboardData = Readonly<{
  /** Device fleet counts grouped by status. */
  deviceStatusCounts: ReadonlyArray<Readonly<{ status: string; count: number }>>;
  /** Total device count. */
  totalDevices: number;
  /** Online device count. */
  onlineDevices: number;
  /** Offline + degraded heartbeat alerts in the last 24h. */
  heartbeatAlertCount: number;
  /** Active maintenance orders. */
  activeMaintenanceCount: number;
  /** Pending IAM requests awaiting IT. */
  pendingIamCount: number;
  /** Alert feed: heartbeat status changes + active maintenance (last 24h). */
  alertFeed: ReadonlyArray<AlertFeedItem>;
  /** Response time data points for the 24h sparkline. */
  responseTimeSeries: ReadonlyArray<number>;
  /** Avg response time (ms) over last 24h. */
  avgResponseTimeMs: number | null;
}>;

export type AlertFeedItem = Readonly<{
  id: string;
  type: "heartbeat" | "maintenance";
  title: string;
  description: string;
  status: string;
  timestamp: string;
  deviceId: string | null;
}>;

export const getSystemDashboard = cache(
  async (client: SupabaseClient<Database>): Promise<SystemDashboardData> => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // ── Root queries (no interdependencies → parallel) ────────────────
    const [devicesResult, heartbeatResult, moResult, iamResult, rtResult] = await Promise.all([
      // 1. Device counts by status
      client.from("devices").select("id, status"),
      // 2. Heartbeat alerts (offline/degraded in last 24h)
      client
        .from("device_heartbeats")
        .select("id, device_id, status, recorded_at, response_time_ms")
        .in("status", ["offline", "degraded"])
        .gte("recorded_at", yesterday)
        .order("recorded_at", { ascending: false }),
      // 3. Active maintenance orders
      client
        .from("maintenance_orders")
        .select("id, status, target_ci_id, vendor_id, maintenance_start, maintenance_end, scope")
        .eq("status", "active"),
      // 4. Pending IAM requests
      client
        .from("iam_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_it"),
      // 5. Response time sparkline (24h)
      client
        .from("device_heartbeats")
        .select("response_time_ms, recorded_at")
        .gte("recorded_at", yesterday)
        .not("response_time_ms", "is", null)
        .order("recorded_at", { ascending: true }),
    ]);

    if (devicesResult.error) throw devicesResult.error;
    if (heartbeatResult.error) throw heartbeatResult.error;
    if (moResult.error) throw moResult.error;
    if (iamResult.error) throw iamResult.error;
    if (rtResult.error) throw rtResult.error;

    const devices = devicesResult.data;
    const heartbeatAlerts = heartbeatResult.data;
    const activeMO = moResult.data;
    const pendingIamCount = iamResult.count ?? 0;
    const responseTimes = rtResult.data;

    // ── Derive aggregates from root results ─────────────────────────────
    const statusMap = new Map<string, number>();
    for (const d of devices ?? []) {
      const s = d.status ?? "unknown";
      statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
    }

    const deviceStatusCounts = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));
    const totalDevices = devices?.length ?? 0;
    const onlineDevices = statusMap.get("online") ?? 0;

    const alertDeviceIds = new Set((heartbeatAlerts ?? []).map((h) => h.device_id));
    const heartbeatAlertCount = alertDeviceIds.size;
    const activeMaintenanceCount = activeMO?.length ?? 0;

    // ── 5. Alert feed: combine heartbeat alerts + active maintenance ────
    // Resolve device names for heartbeat alerts
    const alertDeviceIdList = Array.from(alertDeviceIds);
    const deviceNameMap = new Map<string, string>();
    if (alertDeviceIdList.length > 0) {
      const { data: alertDevices } = await client
        .from("devices")
        .select("id, name")
        .in("id", alertDeviceIdList);
      for (const d of alertDevices ?? []) {
        deviceNameMap.set(d.id, d.name);
      }
    }

    // Resolve device names for maintenance targets
    const moTargetIds = (activeMO ?? []).map((m) => m.target_ci_id);
    if (moTargetIds.length > 0) {
      const { data: moDevices } = await client
        .from("devices")
        .select("id, name")
        .in("id", moTargetIds);
      for (const d of moDevices ?? []) {
        deviceNameMap.set(d.id, d.name);
      }
    }

    // Resolve vendor names for maintenance
    const vendorIds = [...new Set((activeMO ?? []).map((m) => m.vendor_id))];
    const vendorNameMap = new Map<string, string>();
    if (vendorIds.length > 0) {
      const { data: vendors } = await client
        .from("maintenance_vendors")
        .select("id, name")
        .in("id", vendorIds);
      for (const v of vendors ?? []) {
        vendorNameMap.set(v.id, v.name);
      }
    }

    // Build feed: use DISTINCT ON device_id for heartbeat alerts (latest per device)
    const seenDevices = new Set<string>();
    const heartbeatFeedItems: AlertFeedItem[] = [];
    for (const h of heartbeatAlerts ?? []) {
      if (seenDevices.has(h.device_id)) continue;
      seenDevices.add(h.device_id);
      const deviceName = deviceNameMap.get(h.device_id) ?? "Unknown device";
      heartbeatFeedItems.push({
        id: h.id,
        type: "heartbeat",
        title: `${deviceName} is ${h.status}`,
        description:
          h.status === "degraded"
            ? `Response time: ${h.response_time_ms ?? "N/A"}ms`
            : "Device is not responding",
        status: h.status,
        timestamp: h.recorded_at ?? now.toISOString(),
        deviceId: h.device_id,
      });
    }

    const maintenanceFeedItems: AlertFeedItem[] = (activeMO ?? []).map((m) => {
      const deviceName = deviceNameMap.get(m.target_ci_id) ?? "Unknown device";
      const vendorName = vendorNameMap.get(m.vendor_id) ?? "Unknown vendor";
      const endTime = new Date(m.maintenance_end);
      const remaining = Math.max(0, Math.round((endTime.getTime() - now.getTime()) / 60000));
      return {
        id: m.id,
        type: "maintenance" as const,
        title: `Maintenance: ${deviceName}`,
        description: `${vendorName} — ${remaining} min remaining${m.scope ? ` · ${m.scope}` : ""}`,
        status: m.status ?? "active",
        timestamp: m.maintenance_start ?? now.toISOString(),
        deviceId: m.target_ci_id,
      };
    });

    const alertFeed = [...heartbeatFeedItems, ...maintenanceFeedItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // ── Response time sparkline (24h, hourly buckets) ────────────────
    const hourBuckets = new Map<number, number[]>();
    for (const r of responseTimes ?? []) {
      if (r.response_time_ms == null) continue;
      const hour = new Date(r.recorded_at!).getHours();
      const bucket = hourBuckets.get(hour) ?? [];
      bucket.push(r.response_time_ms);
      hourBuckets.set(hour, bucket);
    }

    const responseTimeSeries: number[] = [];
    let totalResponseMs = 0;
    let responseCount = 0;
    for (let h = 0; h < 24; h++) {
      const bucket = hourBuckets.get(h);
      if (bucket && bucket.length > 0) {
        const sorted = [...bucket].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)]!;
        responseTimeSeries.push(median);
        totalResponseMs += bucket.reduce((s, v) => s + v, 0);
        responseCount += bucket.length;
      } else {
        // No data for this hour — use last known value or 0
        responseTimeSeries.push(responseTimeSeries.at(-1) ?? 0);
      }
    }

    const avgResponseTimeMs =
      responseCount > 0 ? Math.round(totalResponseMs / responseCount) : null;

    return {
      deviceStatusCounts,
      totalDevices,
      onlineDevices,
      heartbeatAlertCount,
      activeMaintenanceCount,
      pendingIamCount: pendingIamCount ?? 0,
      alertFeed,
      responseTimeSeries,
      avgResponseTimeMs,
    };
  },
);
