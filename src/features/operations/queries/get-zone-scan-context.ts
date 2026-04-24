import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { ZoneScanContext, ZoneEntry } from "@/features/operations/types";

/**
 * Fetch the caller's current zone (left_at IS NULL) + last 5 entries.
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

    const { data: recentRaw, error } = await client
      .from("crew_zones")
      .select("id, zone_id, scanned_at, left_at, zones(name)")
      .eq("staff_record_id", profile.staff_record_id)
      .order("scanned_at", { ascending: false })
      .limit(5);
    if (error) throw error;

    const entries: ZoneEntry[] = (recentRaw ?? []).map((r) => {
      const zone = r.zones as { name: string } | null;
      return {
        id: r.id,
        zoneName: zone?.name ?? r.zone_id,
        scannedAt: r.scanned_at ?? r.id,
        leftAt: r.left_at,
      };
    });

    const currentZone = entries.find((e) => e.leftAt === null) ?? null;

    return {
      staffRecordId: profile.staff_record_id,
      currentZone,
      recentEntries: entries,
    };
  },
);
