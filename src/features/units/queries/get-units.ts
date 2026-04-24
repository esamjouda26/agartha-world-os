import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type UnitRow = Readonly<{
  id: string;
  name: string;
  abbreviation: string;
}>;

/**
 * RSC query — all units of measure ordered by name.
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getUnits = cache(async (client: SupabaseClient<Database>): Promise<UnitRow[]> => {
  const { data, error } = await client
    .from("units")
    .select("id, name, abbreviation")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    abbreviation: u.abbreviation,
  }));
});
