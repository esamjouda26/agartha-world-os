import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Resolve the caller's auto-detected location name for the crew feedback
 * form per [frontend_spec.md:3004](../../../frontend_spec.md#L3004) — the
 * spec requires the location be displayed as read-only context but NOT
 * persisted (`survey_responses` has no location column).
 *
 * Chain: `profiles.id = auth.uid()` → `profiles.staff_record_id`
 *       → `staff_records.org_unit_id` → `locations.org_unit_id`.
 *
 * Returns `null` when the user is not linked to a staff record, when the
 * staff record has no org unit, or when no location maps to that org unit.
 *
 * Cache model (ADR-0006): React `cache()` — per-request dedup only.
 */
export const getFeedbackLocationName = cache(
  async (client: SupabaseClient<Database>, userId: string): Promise<string | null> => {
    const { data: profile } = await client
      .from("profiles")
      .select("staff_record_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.staff_record_id) return null;

    const { data: staffRecord } = await client
      .from("staff_records")
      .select("org_unit_id")
      .eq("id", profile.staff_record_id)
      .maybeSingle();
    if (!staffRecord?.org_unit_id) return null;

    const { data: location } = await client
      .from("locations")
      .select("name")
      .eq("org_unit_id", staffRecord.org_unit_id)
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .maybeSingle();

    return location?.name ?? null;
  },
);
