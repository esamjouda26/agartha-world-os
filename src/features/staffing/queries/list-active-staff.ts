import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActiveStaffRow = Readonly<{
  staffRecordId: string;
  profileId: string;
  displayName: string;
  employeeId: string | null;
  roleId: string | null;
  roleName: string | null;
  roleDisplayName: string | null;
  orgUnitId: string | null;
  orgUnitName: string | null;
  clockedInAt: string;
  shiftExpectedEndTime: string | null;
  shiftName: string | null;
  shiftCode: string | null;
}>;

/**
 * Fetch currently-clocked-in staff via `rpc_get_active_staff()`
 * ([20260422170000_add_rpc_get_active_staff.sql](../../../../supabase/migrations/20260422170000_add_rpc_get_active_staff.sql)).
 * The RPC is SECURITY DEFINER and does its own `reports:r` check —
 * no additional auth guard needed here.
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup. The RPC
 * is gated on the caller's JWT (via `reports:r` claim), so per-user
 * isolation is preserved even though the underlying SQL runs under
 * service-role semantics.
 */
export const listActiveStaff = cache(async (): Promise<ActiveStaffRow[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_active_staff");
  if (error) throw error;

  return (data ?? []).map((row) => ({
    staffRecordId: row.staff_record_id,
    profileId: row.profile_id,
    displayName: row.display_name ?? "",
    employeeId: row.employee_id,
    roleId: row.role_id,
    roleName: row.role_name,
    roleDisplayName: row.role_display_name,
    orgUnitId: row.org_unit_id,
    orgUnitName: row.org_unit_name,
    clockedInAt: row.clocked_in_at,
    shiftExpectedEndTime: row.shift_expected_end_time,
    shiftName: row.shift_name,
    shiftCode: row.shift_code,
  }));
});
