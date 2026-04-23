import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffFilterOption = Readonly<{
  id: string;
  displayName: string;
  employeeId: string | null;
  email: string | null;
}>;

const STAFF_FILTER_LIMIT = 500;

/**
 * Lookup rows for the audit-log "performed by" filter.
 *
 * `profiles_select` RLS is universal-read (gated by `is_claims_fresh()`
 * only — [init_schema.sql:933](../../../../supabase/migrations/20260417064731_init_schema.sql#L933)),
 * so every authenticated user with `reports:r` can fetch this list.
 *
 * Cap at 500 rows sorted by `display_name` for predictable picker
 * order. For orgs >500 staff, a dedicated server-search combobox
 * lands later (Phase 7+ polish).
 */
export const listStaffForAuditFilter = cache(async (): Promise<StaffFilterOption[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, employee_id, email")
    .order("display_name", { ascending: true })
    .limit(STAFF_FILTER_LIMIT);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    displayName: r.display_name ?? "",
    employeeId: r.employee_id,
    email: r.email,
  }));
});
