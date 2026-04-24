import "server-only";

import { cache } from "react";
import { addDays, differenceInMilliseconds, parseISO } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  OperationsDashboardData,
  ZoneOccupancy,
  IncidentCategoryGroup,
  IncidentGroupCount,
  DailyIncidentCount,
  MaintenanceWORow,
  SlotUtilDay,
} from "@/features/operations/types/operations";

// ── Incident category → group mapping ─────────────────────────────────────
const CATEGORY_GROUPS: Record<string, IncidentCategoryGroup> = {
  fire: "safety",
  safety_hazard: "safety",
  biohazard: "safety",
  suspicious_package: "safety",
  spill: "safety",
  medical_emergency: "medical",
  heat_exhaustion: "medical",
  guest_injury: "medical",
  theft: "security",
  vandalism: "security",
  unauthorized_access: "security",
  altercation: "security",
  guest_complaint: "guest",
  lost_child: "guest",
  found_child: "guest",
  crowd_congestion: "guest",
  lost_property: "guest",
  found_property: "guest",
  structural: "structural",
  prop_damage: "structural",
  equipment_failure: "equipment",
  pos_failure: "equipment",
  hardware_failure: "equipment",
  power_outage: "equipment",
  network_outage: "equipment",
  other: "other",
};

const GROUP_LABELS: Record<IncidentCategoryGroup, string> = {
  safety: "Safety",
  medical: "Medical",
  security: "Security",
  guest: "Guest",
  structural: "Structural",
  equipment: "Equipment",
  other: "Other",
};

export const resolvePeriodBounds = (params: {
  range?: string | null;
}): { from: string; to: string } => {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0]!;
  const to = fmt(today);
  switch (params.range) {
    case "7d":
      return { from: fmt(addDays(today, -6)), to };
    case "30d":
      return { from: fmt(addDays(today, -29)), to };
    default:
      return { from: to, to };
  }
};

/**
 * RSC query — Operations Dashboard.
 * Live occupancy always real-time; incidents/maintenance/utilization are period-filtered.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getOperationsDashboard = cache(
  async (
    client: SupabaseClient<Database>,
    bounds: { from: string; to: string },
  ): Promise<OperationsDashboardData> => {
    const fromTs = `${bounds.from}T00:00:00.000Z`;
    const toTs = `${bounds.to}T23:59:59.999Z`;

    // Next 7 days for scheduled maintenance
    const weekEndIso = addDays(new Date(), 7).toISOString().split("T")[0]!;
    const nowIso = new Date().toISOString().split("T")[0]!;

    const [
      telemetryResult,
      zonesResult,
      incidentsResult,
      activeWOResult,
      scheduledWOResult,
      timeSlotsResult,
    ] = await Promise.all([
      // 1. Latest zone telemetry
      client
        .from("zone_telemetry")
        .select("zone_id, current_occupancy, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(500),

      // 2. Active zones with location
      client
        .from("zones")
        .select("id, name, capacity, locations!zones_location_id_fkey ( name )")
        .eq("is_active", true),

      // 3. Incidents for period
      client
        .from("incidents")
        .select("id, category, status, created_at, resolved_at")
        .or(`created_at.gte.${fromTs},resolved_at.gte.${fromTs}`)
        .lte("created_at", toTs),

      // 4. Active maintenance orders
      client
        .from("maintenance_orders")
        .select(
          `id, status, topology, maintenance_start, maintenance_end,
           devices!maintenance_orders_target_ci_id_fkey ( name, zones!devices_zone_id_fkey ( name ) ),
           maintenance_vendors!maintenance_orders_vendor_id_fkey ( name )`,
        )
        .eq("status", "active"),

      // 5. Scheduled maintenance next 7 days
      client
        .from("maintenance_orders")
        .select(
          `id, status, topology, maintenance_start, maintenance_end,
           devices!maintenance_orders_target_ci_id_fkey ( name, zones!devices_zone_id_fkey ( name ) ),
           maintenance_vendors!maintenance_orders_vendor_id_fkey ( name )`,
        )
        .eq("status", "scheduled")
        .gte("maintenance_start", `${nowIso}T00:00:00.000Z`)
        .lte("maintenance_start", `${weekEndIso}T23:59:59.999Z`)
        .order("maintenance_start", { ascending: true }),

      // 6. Time slots for utilization
      client
        .from("time_slots")
        .select(
          "slot_date, booked_count, override_capacity, experiences!time_slots_experience_id_fkey ( capacity_per_slot )",
        )
        .gte("slot_date", bounds.from)
        .lte("slot_date", bounds.to)
        .order("slot_date", { ascending: true }),
    ]);

    if (telemetryResult.error) throw telemetryResult.error;
    if (zonesResult.error) throw zonesResult.error;
    if (incidentsResult.error) throw incidentsResult.error;
    if (activeWOResult.error) throw activeWOResult.error;
    if (scheduledWOResult.error) throw scheduledWOResult.error;
    if (timeSlotsResult.error) throw timeSlotsResult.error;

    // ── Latest telemetry per zone ─────────────────────────────────────
    const latestTelemetry = new Map<string, number>();
    for (const t of telemetryResult.data ?? []) {
      if (!latestTelemetry.has(t.zone_id)) {
        latestTelemetry.set(t.zone_id, t.current_occupancy ?? 0);
      }
    }

    // ── Zone occupancy rows ───────────────────────────────────────────
    let totalOccupancy = 0;
    let totalCapacity = 0;
    const zones: ZoneOccupancy[] = (zonesResult.data ?? [])
      .map((z) => {
        const loc = z.locations as { name: string } | null;
        const occ = latestTelemetry.get(z.id) ?? 0;
        const cap = z.capacity;
        totalOccupancy += occ;
        totalCapacity += cap;
        return {
          zoneId: z.id,
          zoneName: z.name,
          locationName: loc?.name ?? null,
          currentOccupancy: occ,
          capacity: cap,
          loadPct: cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0,
        };
      })
      .sort((a, b) => b.loadPct - a.loadPct);

    // ── Incident groups ───────────────────────────────────────────────
    const incidents = incidentsResult.data ?? [];
    const groupOpenCount: Record<IncidentCategoryGroup, number> = {
      safety: 0,
      medical: 0,
      security: 0,
      guest: 0,
      structural: 0,
      equipment: 0,
      other: 0,
    };
    const groupResolvedCount: Record<IncidentCategoryGroup, number> = {
      safety: 0,
      medical: 0,
      security: 0,
      guest: 0,
      structural: 0,
      equipment: 0,
      other: 0,
    };
    let totalResolutionMs = 0;
    let resolvedWithTimeCount = 0;

    // Daily map for trend
    const dailyMap = new Map<string, { opened: number; resolved: number }>();

    for (const inc of incidents) {
      const group = CATEGORY_GROUPS[inc.category] ?? "other";
      if (inc.status === "open") {
        groupOpenCount[group]++;
      } else if (inc.status === "resolved") {
        groupResolvedCount[group]++;
        if (inc.resolved_at) {
          const ms = differenceInMilliseconds(parseISO(inc.resolved_at), parseISO(inc.created_at));
          if (ms > 0) {
            totalResolutionMs += ms;
            resolvedWithTimeCount++;
          }
        }
      }

      // Opened trend
      const openDate = inc.created_at.split("T")[0]!;
      if (openDate >= bounds.from && openDate <= bounds.to) {
        const d = dailyMap.get(openDate) ?? { opened: 0, resolved: 0 };
        d.opened++;
        dailyMap.set(openDate, d);
      }
      // Resolved trend
      if (inc.resolved_at) {
        const resolvedDate = inc.resolved_at.split("T")[0]!;
        if (resolvedDate >= bounds.from && resolvedDate <= bounds.to) {
          const d = dailyMap.get(resolvedDate) ?? { opened: 0, resolved: 0 };
          d.resolved++;
          dailyMap.set(resolvedDate, d);
        }
      }
    }

    const incidentGroups: IncidentGroupCount[] = (
      Object.keys(GROUP_LABELS) as IncidentCategoryGroup[]
    ).map((group) => ({
      group,
      label: GROUP_LABELS[group],
      open: groupOpenCount[group],
      resolvedInPeriod: groupResolvedCount[group],
    }));

    const incidentTrend: DailyIncidentCount[] = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, opened: v.opened, resolved: v.resolved }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Maintenance WOs ───────────────────────────────────────────────
    function mapWO(wos: typeof activeWOResult.data): MaintenanceWORow[] {
      return (wos ?? []).map((wo) => {
        const device = wo.devices as { name: string; zones?: { name: string } | null } | null;
        const zone = device?.zones as { name: string } | null;
        const vendor = wo.maintenance_vendors as { name: string } | null;
        return {
          id: wo.id,
          status: wo.status ?? "active",
          topology: wo.topology,
          deviceName: device?.name ?? "Unknown device",
          zoneName: zone?.name ?? null,
          vendorName: vendor?.name ?? "Unknown vendor",
          maintenanceStart: wo.maintenance_start,
          maintenanceEnd: wo.maintenance_end,
        };
      });
    }

    // ── Slot utilization ──────────────────────────────────────────────
    const slotDayMap = new Map<string, { booked: number; capacity: number }>();
    for (const slot of timeSlotsResult.data ?? []) {
      const exp = slot.experiences as { capacity_per_slot: number | null } | null;
      const cap = slot.override_capacity ?? exp?.capacity_per_slot ?? 0;
      if (cap <= 0) continue;
      const ex = slotDayMap.get(slot.slot_date) ?? { booked: 0, capacity: 0 };
      ex.booked += slot.booked_count ?? 0;
      ex.capacity += cap;
      slotDayMap.set(slot.slot_date, ex);
    }
    const slotUtilization: SlotUtilDay[] = Array.from(slotDayMap.entries())
      .map(([date, v]) => ({
        date,
        utilPct: v.capacity > 0 ? Math.min(100, Math.round((v.booked / v.capacity) * 100)) : 0,
        bookedCount: v.booked,
        capacity: v.capacity,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      periodFrom: bounds.from,
      periodTo: bounds.to,
      totalOccupancy,
      totalCapacity,
      zones,
      incidentGroups,
      avgResolutionMs:
        resolvedWithTimeCount > 0 ? Math.round(totalResolutionMs / resolvedWithTimeCount) : null,
      incidentTrend,
      activeWOs: mapWO(activeWOResult.data),
      scheduledWOs: mapWO(scheduledWOResult.data),
      slotUtilization,
    };
  },
);
