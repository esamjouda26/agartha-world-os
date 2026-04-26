import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  StaffDetailData,
  StaffProfile,
  LeaveBalanceRow,
  EquipmentRow,
  AttendanceSummary,
} from "@/features/hr/types/staff-detail";

/**
 * RSC query — all data for /management/hr/[id] (staff detail page).
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * Parallel fetches for: staff record, leave balances, equipment, attendance summary,
 * leave policies, and roles for dropdowns.
 */
export const getStaffDetail = cache(
  async (client: SupabaseClient<Database>, staffId: string): Promise<StaffDetailData | null> => {
    // ── 1. Staff record + profile + role + org_unit ──────────────────
    const { data: sr, error: srErr } = await client
      .from("staff_records")
      .select(
        `
        id,
        legal_name,
        personal_email,
        phone,
        address,
        contract_start,
        contract_end,
        org_unit_id,
        leave_policy_id,
        kin_name,
        kin_relationship,
        kin_phone,
        created_at,
        profiles (
          display_name,
          employee_id,
          employment_status,
          role_id,
          email,
          roles ( display_name )
        ),
        org_units!staff_records_org_unit_id_fkey ( name ),
        leave_policies ( name )
        `,
      )
      .eq("id", staffId)
      .maybeSingle();

    if (srErr) throw srErr;
    if (!sr) return null;

    // PostgREST returns an object (not array) for one-to-one relations (UNIQUE FK).
    const profileRow = sr.profiles as unknown as {
      display_name: string | null;
      employee_id: string | null;
      employment_status: string | null;
      role_id: string | null;
      email: string | null;
      roles: { display_name: string } | null;
    } | null;
    const authUserId = profileRow ? staffId : null; // profiles.id = auth user id

    const [leaveBalancesRes, equipmentRes, exceptionsRes, policiesRes, rolesRes] =
      await Promise.all([
        // Leave balances from view — full audit breakdown
        client
          .from("v_leave_balances")
          .select(
            "leave_type_name, accrued_days, carry_forward_days, adjustment_days, used_days, forfeiture_days, balance",
          )
          .eq("staff_record_id", staffId),

        // Equipment assignments — no serial_number column; join materials for name
        authUserId
          ? client
              .from("equipment_assignments")
              .select("id, assigned_at, returned_at, materials ( name )")
              .eq("assigned_to", authUserId)
              .order("assigned_at", { ascending: false })
          : Promise.resolve({ data: [] as never[], error: null }),

        // Open exception count
        client
          .from("attendance_exceptions")
          .select("id", { count: "exact", head: true })
          .eq("staff_record_id", staffId)
          .eq("status", "pending_review"),

        // Available leave policies for dropdown — leave_policies has is_active
        client
          .from("leave_policies")
          .select("id, name")
          .eq("is_active", true)
          .order("name", { ascending: true }),

        // Available roles for transfer — roles has no is_active, fetch all
        client.from("roles").select("id, display_name").order("display_name", { ascending: true }),
      ]);

    // ── 3. Map profile ──────────────────────────────────────────────
    const orgUnit = sr.org_units as { name: string } | null;
    const leavePolicy = sr.leave_policies as { name: string } | null;

    const profile: StaffProfile = {
      id: sr.id,
      legalName: sr.legal_name,
      displayName: profileRow?.display_name ?? null,
      employeeId: profileRow?.employee_id ?? null,
      personalEmail: sr.personal_email ?? null,
      businessEmail: profileRow?.email ?? null,
      phone: sr.phone ?? null,
      address: sr.address ?? null,
      employmentStatus: profileRow?.employment_status ?? "pending",
      roleName: profileRow?.roles?.display_name ?? null,
      roleId: profileRow?.role_id ?? null,
      orgUnitName: orgUnit?.name ?? null,
      orgUnitId: sr.org_unit_id ?? null,
      contractStart: sr.contract_start ?? null,
      contractEnd: sr.contract_end ?? null,
      kinName: sr.kin_name ?? null,
      kinRelationship: sr.kin_relationship ?? null,
      kinPhone: sr.kin_phone ?? null,
      createdAt: sr.created_at,
    };

    // ── 4. Map leave balances ───────────────────────────────────────
    const leaveBalances: LeaveBalanceRow[] = (leaveBalancesRes.data ?? []).map((lb) => ({
      leaveTypeName: lb.leave_type_name ?? "Unknown",
      accrued: Number(lb.accrued_days ?? 0),
      carried: Number(lb.carry_forward_days ?? 0),
      adjusted: Number(lb.adjustment_days ?? 0),
      used: Math.abs(Number(lb.used_days ?? 0)),
      forfeited: Math.abs(Number(lb.forfeiture_days ?? 0)),
      balance: Number(lb.balance ?? 0),
    }));

    // ── 5. Map equipment ────────────────────────────────────────────
    const equipmentAssignments: EquipmentRow[] = (equipmentRes.data ?? []).map((ea) => {
      const mat = ea.materials as { name: string } | null;
      return {
        id: ea.id,
        materialName: mat?.name ?? "Unknown",
        serialNumber: null, // equipment_assignments has no serial_number col
        assignedAt: ea.assigned_at,
        returnedAt: ea.returned_at,
      };
    });

    // ── 6. Attendance summary ───────────────────────────────────────
    const attendanceSummary: AttendanceSummary = {
      daysPresent: 0,
      daysAbsent: 0,
      daysLate: 0,
      openExceptions: exceptionsRes.count ?? 0,
    };

    return {
      profile,
      leaveBalances,
      equipmentAssignments,
      attendanceSummary,
      leavePolicyId: sr.leave_policy_id ?? null,
      leavePolicyName: leavePolicy?.name ?? null,
      availableLeavePolicies: (policiesRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
      availableRoles: (rolesRes.data ?? []).map((r) => ({
        id: r.id,
        displayName: r.display_name,
      })),
    };
  },
);
