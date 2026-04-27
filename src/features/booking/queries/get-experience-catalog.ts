import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExperienceCatalog, TierWithPerks } from "@/features/booking/types/wizard";

/**
 * Resolve the single active experience and the tiers bookable on it.
 *
 * Why anon-readable: experiences/tiers/tier_perks/experience_tiers carry
 * dedicated `_select_anon` RLS policies (init_schema.sql:3379, 3391, 3403,
 * 3415). Server Component reads use the cookie-bound client; for guests
 * with no session the request runs under `anon` automatically.
 *
 * Wrapped in React.cache so the same RSC tree (page.tsx + nested
 * components) shares one DB roundtrip per request — ADR-0006 forbids
 * unstable_cache here because anon RLS is request-scoped.
 *
 * Active experience invariant: `idx_experiences_single_active` (init_schema.sql:3221)
 * guarantees at most one row with is_active = TRUE. We return null when no
 * experience exists rather than throw — page-level UI renders a polite
 * "experiences coming soon" empty state.
 */
export const getActiveExperienceCatalog = cache(async (): Promise<ExperienceCatalog | null> => {
  const supabase = await createSupabaseServerClient();

  const { data: experience, error: experienceError } = await supabase
    .from("experiences")
    // .single() — `idx_experiences_single_active` enforces at-most-one;
    // .maybeSingle() so an empty catalog returns null instead of throwing.
    .select(
      "id, name, description, capacity_per_slot, max_facility_capacity, arrival_window_minutes",
    )
    .eq("is_active", true)
    .maybeSingle();

  if (experienceError || !experience) return null;

  const { data: tierLinks, error: tiersError } = await supabase
    .from("experience_tiers")
    .select("tier_id, tiers ( id, name, adult_price, child_price, duration_minutes, sort_order )")
    .eq("experience_id", experience.id);

  if (tiersError || !tierLinks || tierLinks.length === 0) {
    return { experience, tiers: [] } as const;
  }

  const tierIds = tierLinks.map((row) => row.tiers?.id).filter((id): id is string => Boolean(id));

  const { data: perkRows } = await supabase
    .from("tier_perks")
    .select("tier_id, perk")
    .in("tier_id", tierIds);

  const perksByTier = new Map<string, string[]>();
  for (const row of perkRows ?? []) {
    const list = perksByTier.get(row.tier_id) ?? [];
    list.push(row.perk);
    perksByTier.set(row.tier_id, list);
  }

  const tiers: TierWithPerks[] = tierLinks
    .map((row) => row.tiers)
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .map((tier) => ({
      id: tier.id,
      name: tier.name,
      adult_price: Number(tier.adult_price),
      child_price: Number(tier.child_price),
      duration_minutes: tier.duration_minutes,
      sort_order: tier.sort_order ?? 0,
      perks: (perksByTier.get(tier.id) ?? []).slice().sort(),
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.adult_price - b.adult_price);

  return { experience, tiers };
});
