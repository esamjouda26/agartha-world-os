import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { ZoneScanContext, ZoneEntry } from "@/features/operations/types";

/**
 * Fetch the caller's current zone (left_at IS NULL) + zone entries for the
 * current shift (frontend_spec.md:2962 — "Last 5 zone entries for current
 * shift"). The shift boundary is the most-recent un-voided clock-in punch
 * (init_schema.sql:1636 — timecard_punches). When no clock-in exists today
 * we treat the staff member as off-shift and return an empty history.
 *
 * init_schema.sql:1116 — crew_zones; init_schema.sql:1091 — zones.
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getZoneScanContext = cache(
  async (client: SupabaseClient<Database>, userId: string): Promise<ZoneScanContext | null> => {
    const { data: profile } = await client
      .from("profiles")
      .select("staff_record_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.staff_record_id) return null;

    // Resolve the start of the current shift via the latest non-voided
    // clock-in punch. Anything older than that belongs to a previous shift.
    const { data: latestClockIn } = await client
      .from("timecard_punches")
      .select("punch_time")
      .eq("staff_record_id", profile.staff_record_id)
      .eq("punch_type", "clock_in")
      .is("voided_at", null)
      .order("punch_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    const shiftStartIso = latestClockIn?.punch_time ?? null;

    // Current zone is shift-agnostic: if the runner is physically in a zone
    // right now (left_at IS NULL) we surface it regardless of when they
    // scanned, so the "Leave Zone" CTA always works.
    const { data: currentRaw } = await client
      .from("crew_zones")
      .select("id, zone_id, scanned_at, left_at, zones(name)")
      .eq("staff_record_id", profile.staff_record_id)
      .is("left_at", null)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentZone: ZoneEntry | null = currentRaw
      ? {
          id: currentRaw.id,
          zoneName: (currentRaw.zones as { name: string } | null)?.name ?? currentRaw.zone_id,
          scannedAt: currentRaw.scanned_at ?? currentRaw.id,
          leftAt: currentRaw.left_at,
        }
      : null;

    // History is bounded to the current shift. No clock-in → no shift → no
    // history (returning an empty page rather than the global last-5 prevents
    // leaking yesterday's movement).
    let entries: ZoneEntry[] = [];
    if (shiftStartIso) {
      const { data: recentRaw, error } = await client
        .from("crew_zones")
        .select("id, zone_id, scanned_at, left_at, zones(name)")
        .eq("staff_record_id", profile.staff_record_id)
        .gte("scanned_at", shiftStartIso)
        .order("scanned_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      entries = (recentRaw ?? []).map((r) => {
        const zone = r.zones as { name: string } | null;
        return {
          id: r.id,
          zoneName: zone?.name ?? r.zone_id,
          scannedAt: r.scanned_at ?? r.id,
          leftAt: r.left_at,
        };
      });
    }

    return {
      staffRecordId: profile.staff_record_id,
      currentZone,
      recentEntries: entries,
    };
  },
);
