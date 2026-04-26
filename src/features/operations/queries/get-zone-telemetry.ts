import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// ── View-model types ──────────────────────────────────────────────────

export type TelemetryZoneCard = Readonly<{
  zoneId: string;
  zoneName: string;
  currentOccupancy: number;
  capacity: number;
  loadPct: number;
  crewCount: number;
  temperature: number | null;
  humidity: number | null;
}>;

export type TelemetryLocationGroup = Readonly<{
  locationId: string;
  locationName: string;
  zones: ReadonlyArray<TelemetryZoneCard>;
}>;

export type TelemetryData = Readonly<{
  totalGuests: number;
  totalCrew: number;
  zonesAtCapacity: number;
  groups: ReadonlyArray<TelemetryLocationGroup>;
}>;

// ── Query ──────────────────────────────────────────────────────────────

/**
 * Fetch zone telemetry for the real-time occupancy dashboard.
 *
 * Three round-trips:
 * 1. `zones` JOIN `locations` (zone metadata + capacity)
 * 2. `zone_telemetry` — latest per zone (DISTINCT ON in a subquery)
 * 3. `crew_zones` WHERE left_at IS NULL (active crew per zone)
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup.
 */
export const getZoneTelemetry = cache(async (): Promise<TelemetryData> => {
  const supabase = await createSupabaseServerClient();

  // 1. All active zones with location info
  const { data: zones, error: zErr } = await supabase
    .from("zones")
    .select("id, name, capacity, location_id, locations!inner(id, name)")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (zErr) throw zErr;
  if (!zones || zones.length === 0) {
    return { totalGuests: 0, totalCrew: 0, zonesAtCapacity: 0, groups: [] };
  }

  const zoneIds = zones.map((z) => z.id);

  // 2. Latest telemetry per zone — fetch recent and pick latest per zone client-side
  const { data: telemetryRows, error: tErr } = await supabase
    .from("zone_telemetry")
    .select("zone_id, current_occupancy, temperature, humidity, recorded_at")
    .in("zone_id", zoneIds)
    .order("recorded_at", { ascending: false });
  if (tErr) throw tErr;

  // Pick the latest per zone
  const latestByZone = new Map<
    string,
    { current_occupancy: number; temperature: number | null; humidity: number | null }
  >();
  for (const row of telemetryRows ?? []) {
    if (!latestByZone.has(row.zone_id)) {
      latestByZone.set(row.zone_id, {
        current_occupancy: row.current_occupancy ?? 0,
        temperature: row.temperature != null ? Number(row.temperature) : null,
        humidity: row.humidity != null ? Number(row.humidity) : null,
      });
    }
  }

  // 3. Active crew per zone (left_at IS NULL)
  const { data: crewRows, error: cErr } = await supabase
    .from("crew_zones")
    .select("zone_id")
    .in("zone_id", zoneIds)
    .is("left_at", null);
  if (cErr) throw cErr;

  const crewCountByZone = new Map<string, number>();
  for (const row of crewRows ?? []) {
    crewCountByZone.set(row.zone_id, (crewCountByZone.get(row.zone_id) ?? 0) + 1);
  }

  // ── Assemble ────────────────────────────────────────────────────────

  const locationMap = new Map<string, { id: string; name: string; zones: TelemetryZoneCard[] }>();

  let totalGuests = 0;
  let totalCrew = 0;
  let zonesAtCapacity = 0;

  for (const zone of zones) {
    const loc = zone.locations as unknown as { id: string; name: string };
    const telemetry = latestByZone.get(zone.id);
    const occ = telemetry?.current_occupancy ?? 0;
    const crew = crewCountByZone.get(zone.id) ?? 0;
    const capacity = zone.capacity;
    const loadPct = capacity > 0 ? Math.round((occ / capacity) * 100) : 0;

    totalGuests += occ;
    totalCrew += crew;
    if (occ >= capacity) zonesAtCapacity++;

    const card: TelemetryZoneCard = {
      zoneId: zone.id,
      zoneName: zone.name,
      currentOccupancy: occ,
      capacity,
      loadPct,
      crewCount: crew,
      temperature: telemetry?.temperature ?? null,
      humidity: telemetry?.humidity ?? null,
    };

    if (!locationMap.has(loc.id)) {
      locationMap.set(loc.id, { id: loc.id, name: loc.name, zones: [] });
    }
    locationMap.get(loc.id)!.zones.push(card);
  }

  const groups: TelemetryLocationGroup[] = Array.from(locationMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({
      locationId: g.id,
      locationName: g.name,
      zones: g.zones,
    }));

  return { totalGuests, totalCrew, zonesAtCapacity, groups };
});
