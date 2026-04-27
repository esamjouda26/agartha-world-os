import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Result shape for the Staff Accounts tab on the IAM Ledger page.
 *
 * Cache model (ADR-0006): React `cache()` only — request-scoped dedup.
 * RLS-scoped reads cannot use `unstable_cache`.
 */
export type StaffAccountsData = Readonly<{
  accounts: ReadonlyArray<StaffAccountRow>;
  /** Counts keyed by employment_status for tab badges. */
  statusCounts: Readonly<Record<string, number>>;
}>;

export type StaffAccountRow = Readonly<{
  /** staff_records.id — used as the action target. */
  id: string;
  /** auth user id (profiles.id) — null if no profile linked yet. */
  profileId: string | null;
  displayName: string | null;
  legalName: string;
  employeeId: string | null;
  email: string | null;
  employmentStatus: string;
  roleName: string | null;
  orgUnitName: string | null;
}>;

export const getStaffAccounts = cache(
  async (client: SupabaseClient<Database>): Promise<StaffAccountsData> => {
    const { data, error } = await client
      .from("staff_records")
      .select(
        `id, legal_name,
         profiles!profiles_staff_record_id_fkey (
           id, display_name, employee_id, email, employment_status,
           roles!profiles_role_id_fkey ( display_name )
         ),
         org_units!staff_records_org_unit_id_fkey ( name )`,
      )
      .order("legal_name", { ascending: true });

    if (error) throw error;

    const statusCounts: Record<string, number> = {};

    const accounts: StaffAccountRow[] = (data ?? []).map((sr) => {
      // Supabase returns joined FK as object or null
      const profile = sr.profiles as {
        id: string;
        display_name: string | null;
        employee_id: string | null;
        email: string | null;
        employment_status: string;
        roles: { display_name: string } | null;
      } | null;

      const orgUnit = sr.org_units as { name: string } | null;
      const status = profile?.employment_status ?? "pending";

      statusCounts[status] = (statusCounts[status] ?? 0) + 1;

      return {
        id: sr.id,
        profileId: profile?.id ?? null,
        displayName: profile?.display_name ?? null,
        legalName: sr.legal_name,
        employeeId: profile?.employee_id ?? null,
        email: profile?.email ?? null,
        employmentStatus: status,
        roleName: profile?.roles?.display_name ?? null,
        orgUnitName: orgUnit?.name ?? null,
      };
    });

    return { accounts, statusCounts };
  },
);
