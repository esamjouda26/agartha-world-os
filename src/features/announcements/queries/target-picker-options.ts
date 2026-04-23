import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Lookup rows for the announcement target-audience picker.
 *
 * All three underlying tables (`roles`, `org_units`, `profiles`) have
 * universal-read RLS policies gated only by `is_claims_fresh()`, so any
 * authenticated user with comms:c can fetch them. We keep the payloads
 * narrow (id + display string + optional search alias) so the picker's
 * `<SearchableSelect>` renders fast and the RSC → Client serialisation
 * stays small.
 *
 * Cache model: React `cache()` per-request. These lists change rarely —
 * a future Phase 7 optimisation is moving org-wide reads into
 * `unstable_cache` with per-entity tags (ADR-0006 keeps that lane
 * reserved).
 */

export type RoleOption = Readonly<{ id: string; displayName: string }>;
export type OrgUnitOption = Readonly<{
  id: string;
  name: string;
  code: string;
  path: string;
}>;
export type StaffOption = Readonly<{
  id: string;
  displayName: string;
  employeeId: string | null;
  email: string | null;
}>;

export const listRoleOptions = cache(async (): Promise<RoleOption[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, display_name")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, displayName: r.display_name }));
});

export const listOrgUnitOptions = cache(async (): Promise<OrgUnitOption[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("org_units")
    .select("id, name, code, path")
    .eq("is_active", true)
    .order("path", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    // `path` is an ltree cast to string by the Supabase client.
    path: String(r.path),
  }));
});

export const listStaffOptions = cache(async (): Promise<StaffOption[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, employee_id, email")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    displayName: r.display_name ?? "",
    employeeId: r.employee_id,
    email: r.email,
  }));
});
