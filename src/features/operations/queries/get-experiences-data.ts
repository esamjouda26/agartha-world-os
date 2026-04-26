import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// ── View-model types ──────────────────────────────────────────────────

export type ExperienceRow = Readonly<{
  id: string;
  name: string;
  capacityPerSlot: number | null;
  maxFacilityCapacity: number;
  arrivalWindowMinutes: number;
  isActive: boolean;
  tierIds: string[];
}>;

export type TierRow = Readonly<{
  id: string;
  name: string;
  adultPrice: number;
  childPrice: number;
  durationMinutes: number;
  sortOrder: number;
  perks: string[];
}>;

export type SchedulerConfigRow = Readonly<{
  experienceId: string;
  experienceName: string;
  daysAhead: number;
  dayStartHour: number;
  dayEndHour: number;
  startDate: string;
  endDate: string | null;
}>;

export type ExperiencesPageData = Readonly<{
  experiences: ExperienceRow[];
  tiers: TierRow[];
  schedulerConfigs: SchedulerConfigRow[];
}>;

// ── Query ──────────────────────────────────────────────────────────────

/**
 * Fetch all experience config data for the 3-tab management page.
 *
 * 4 round-trips:
 * 1. experiences
 * 2. tiers + tier_perks
 * 3. experience_tiers (junction)
 * 4. scheduler_config + experiences (for name)
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup.
 */
export const getExperiencesData = cache(async (): Promise<ExperiencesPageData> => {
  const supabase = await createSupabaseServerClient();

  // 1. Experiences
  const { data: expRows, error: eErr } = await supabase
    .from("experiences")
    .select("id, name, capacity_per_slot, max_facility_capacity, arrival_window_minutes, is_active")
    .order("name", { ascending: true });
  if (eErr) throw eErr;

  // 2. Experience-tier junction
  const { data: junctionRows, error: jErr } = await supabase
    .from("experience_tiers")
    .select("experience_id, tier_id");
  if (jErr) throw jErr;

  const tiersByExp = new Map<string, string[]>();
  for (const row of junctionRows ?? []) {
    const arr = tiersByExp.get(row.experience_id) ?? [];
    arr.push(row.tier_id);
    tiersByExp.set(row.experience_id, arr);
  }

  const experiences: ExperienceRow[] = (expRows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    capacityPerSlot: r.capacity_per_slot,
    maxFacilityCapacity: r.max_facility_capacity,
    arrivalWindowMinutes: r.arrival_window_minutes ?? 15,
    isActive: r.is_active ?? true,
    tierIds: tiersByExp.get(r.id) ?? [],
  }));

  // 3. Tiers + perks
  const { data: tierRows, error: tErr } = await supabase
    .from("tiers")
    .select("id, name, adult_price, child_price, duration_minutes, sort_order")
    .order("sort_order", { ascending: true });
  if (tErr) throw tErr;

  const tierIds = (tierRows ?? []).map((t) => t.id);
  const { data: perkRows, error: pErr } = await supabase
    .from("tier_perks")
    .select("tier_id, perk")
    .in("tier_id", tierIds.length > 0 ? tierIds : ["__none__"]);
  if (pErr) throw pErr;

  const perksByTier = new Map<string, string[]>();
  for (const p of perkRows ?? []) {
    const arr = perksByTier.get(p.tier_id) ?? [];
    arr.push(p.perk);
    perksByTier.set(p.tier_id, arr);
  }

  const tiers: TierRow[] = (tierRows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    adultPrice: Number(r.adult_price),
    childPrice: Number(r.child_price),
    durationMinutes: r.duration_minutes,
    sortOrder: r.sort_order ?? 0,
    perks: perksByTier.get(r.id) ?? [],
  }));

  // 4. Scheduler config
  const { data: scRows, error: sErr } = await supabase
    .from("scheduler_config")
    .select("experience_id, days_ahead, day_start_hour, day_end_hour, start_date, end_date");
  if (sErr) throw sErr;

  const expNameById = new Map<string, string>();
  for (const e of experiences) expNameById.set(e.id, e.name);

  const schedulerConfigs: SchedulerConfigRow[] = (scRows ?? []).map((r) => ({
    experienceId: r.experience_id,
    experienceName: expNameById.get(r.experience_id) ?? "—",
    daysAhead: r.days_ahead,
    dayStartHour: r.day_start_hour,
    dayEndHour: r.day_end_hour,
    startDate: r.start_date,
    endDate: r.end_date,
  }));

  return { experiences, tiers, schedulerConfigs };
});
