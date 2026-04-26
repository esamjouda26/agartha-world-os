import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { StaffListData, StaffRow, StaffKpis } from "@/features/hr/types/staff";

/**
 * RSC query — all data for /management/hr (staff management list).
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * RLS Tier 4 (hr domain) scopes results by org_unit_path.
 */
export const getStaffList = cache(
  async (client: SupabaseClient<Database>): Promise<StaffListData> => {
    const { data, error } = await client
      .from("staff_records")
      .select(
        `
        id,
        org_unit_id,
        legal_name,
        personal_email,
        contract_start,
        contract_end,
        created_at,
        profiles (
          display_name,
          employee_id,
          employment_status,
          role_id,
          roles ( display_name )
        ),
        org_units!staff_records_org_unit_id_fkey ( name )
        `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const now = new Date();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    let activeCount = 0;
    let onLeaveCount = 0;
    let pendingCount = 0;
    let expiringCount = 0;

    const staff: StaffRow[] = (data ?? []).map((sr) => {
      // profiles is a one-to-one reverse relation (profiles.staff_record_id → staff_records.id)
      // PostgREST returns an object (not array) when the FK has a UNIQUE constraint.
      const profile = sr.profiles as unknown as {
        display_name: string | null;
        employee_id: string | null;
        employment_status: string | null;
        role_id: string | null;
        roles: { display_name: string } | null;
      } | null;

      const orgUnit = sr.org_units as { name: string } | null;
      const status = profile?.employment_status ?? "pending";

      // KPI accumulation
      if (status === "active") activeCount++;
      else if (status === "on_leave") onLeaveCount++;
      else if (status === "pending") pendingCount++;

      if (sr.contract_end) {
        const endTs = new Date(sr.contract_end).getTime();
        const nowTs = now.getTime();
        if (endTs > nowTs && endTs - nowTs <= thirtyDaysMs) expiringCount++;
      }

      return {
        id: sr.id,
        displayName: profile?.display_name ?? sr.legal_name,
        employeeId: profile?.employee_id ?? null,
        legalName: sr.legal_name,
        personalEmail: sr.personal_email ?? null,
        employmentStatus: status,
        roleName: profile?.roles?.display_name ?? null,
        roleId: profile?.role_id ?? null,
        orgUnitName: orgUnit?.name ?? null,
        orgUnitId: sr.org_unit_id ?? null,
        contractStart: sr.contract_start ?? null,
        contractEnd: sr.contract_end ?? null,
        createdAt: sr.created_at,
      };
    });

    const kpis: StaffKpis = { activeCount, onLeaveCount, pendingCount, expiringCount };
    return { staff, kpis };
  },
);
