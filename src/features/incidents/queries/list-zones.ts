import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ZoneOption = Readonly<{
  id: string;
  name: string;
}>;

/**
 * Lookup rows for the incident-report zone picker. `zones_select` is
 * universal-read, so every authenticated caller sees the full list.
 * Sorted by name for predictable picker order.
 */
export const listZoneOptions = cache(async (): Promise<ZoneOption[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("zones")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, name: r.name }));
});
