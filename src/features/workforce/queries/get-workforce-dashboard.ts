import "server-only";

import { cache } from "react";
import { addDays } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type AccessLevelCount = Readonly<{ accessLevel: string; count: number }>;

export type AttendanceDay = Readonly<{
  date: string;
  ratePct: number;
  scheduled: number;
  present: number;
}>;

export type ExceptionByType = Readonly<{ type: string; label: string; count: number }>;

export type ExceptionLeaderEntry = Readonly<{
  staffRecordId: string;
  displayName: string;
  count: number;
}>;

export type DepartmentCount = Readonly<{
  orgUnitId: string;
  orgUnitName: string;
  staffCount: number;
}>;

export type WorkforceDashboardData = Readonly<{
  periodFrom: string;
  periodTo: string;
  // Headcount
  totalActive: number;
  byAccessLevel: ReadonlyArray<AccessLevelCount>;
  newHires: number;
  departures: number;
  onLeave: number;
  // Attendance
  attendanceRatePct: number | null;
  attendanceTrend: ReadonlyArray<AttendanceDay>;
  exceptionsByType: ReadonlyArray<ExceptionByType>;
  exceptionLeaderboard: ReadonlyArray<ExceptionLeaderEntry>;
  // Leave
  avgLeaveUtilPct: number | null;
  // Department distribution
  departmentDistribution: ReadonlyArray<DepartmentCount>;
}>;

const EXCEPTION_LABELS: Record<string, string> = {
  late_arrival: "Late Arrival",
  early_departure: "Early Departure",
  missing_clock_in: "Missing Clock-In",
  missing_clock_out: "Missing Clock-Out",
  absent: "Absent",
};

export function resolvePeriodBounds(params: { range?: string | null }): {
  from: string;
  to: string;
} {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0]!;
  const to = fmt(today);
  switch (params.range) {
    case "7d":
      return { from: fmt(addDays(today, -6)), to };
    case "30d":
    default:
      return { from: fmt(addDays(today, -29)), to };
  }
}

export const getWorkforceDashboard = cache(
  async (
    client: SupabaseClient<Database>,
    bounds: { from: string; to: string },
  ): Promise<WorkforceDashboardData> => {
    const fromTs = `${bounds.from}T00:00:00.000Z`;
    const toTs = `${bounds.to}T23:59:59.999Z`;
    const fiscalYear = new Date().getFullYear();

    const [
      profilesResult,
      newHiresResult,
      shiftAttendanceResult,
      exceptionsResult,
      leaveBalancesResult,
      orgUnitsResult,
    ] = await Promise.all([
      // 1. All active profiles with role access_level
      client
        .from("profiles")
        .select(
          "id, display_name, employment_status, staff_record_id, roles!profiles_role_id_fkey ( access_level ), updated_at",
        ),

      // 2. New hires in period
      client
        .from("staff_records")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromTs)
        .lte("created_at", toTs),

      // 3. Shift attendance for period
      client
        .from("v_shift_attendance")
        .select("shift_date, derived_status")
        .gte("shift_date", bounds.from)
        .lte("shift_date", bounds.to),

      // 4. Unjustified exceptions — staff_record_id only; names resolved below via profiles
      client
        .from("attendance_exceptions")
        .select("type, staff_record_id")
        .eq("status", "unjustified")
        .gte("created_at", fromTs)
        .lte("created_at", toTs),

      // 5. Leave balances for current fiscal year
      client.from("v_leave_balances").select("accrued_days, used_days, fiscal_year"),

      // 6. Top-level org units for department distribution
      client
        .from("org_units")
        .select("id, name, staff_records!staff_records_org_unit_id_fkey ( id )")
        .is("parent_id", null)
        .eq("is_active", true),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (shiftAttendanceResult.error) throw shiftAttendanceResult.error;
    if (exceptionsResult.error) throw exceptionsResult.error;
    if (leaveBalancesResult.error) throw leaveBalancesResult.error;
    if (orgUnitsResult.error) throw orgUnitsResult.error;

    // ── Headcount ────────────────────────────────────────────────────
    const profiles = profilesResult.data ?? [];
    const activeProfiles = profiles.filter((p) => p.employment_status === "active");
    const totalActive = activeProfiles.length;

    const alMap = new Map<string, number>();
    for (const p of activeProfiles) {
      const role = p.roles as { access_level: string } | null;
      const al = role?.access_level ?? "unknown";
      alMap.set(al, (alMap.get(al) ?? 0) + 1);
    }
    const byAccessLevel: AccessLevelCount[] = Array.from(alMap.entries())
      .map(([accessLevel, count]) => ({ accessLevel, count }))
      .sort((a, b) => b.count - a.count);

    const departures = profiles.filter(
      (p) =>
        p.employment_status === "terminated" &&
        p.updated_at &&
        p.updated_at >= fromTs &&
        p.updated_at <= toTs,
    ).length;

    const onLeave = profiles.filter((p) => p.employment_status === "on_leave").length;

    // ── Attendance ───────────────────────────────────────────────────
    const shifts = shiftAttendanceResult.data ?? [];
    const dailyShiftMap = new Map<string, { scheduled: number; present: number }>();
    for (const s of shifts) {
      const date = s.shift_date as string;
      const ex = dailyShiftMap.get(date) ?? { scheduled: 0, present: 0 };
      ex.scheduled += 1;
      if (["completed", "in_progress", "on_leave"].includes(s.derived_status ?? ""))
        ex.present += 1;
      dailyShiftMap.set(date, ex);
    }

    const attendanceTrend: AttendanceDay[] = Array.from(dailyShiftMap.entries())
      .map(([date, v]) => ({
        date,
        ratePct: v.scheduled > 0 ? Math.round((v.present / v.scheduled) * 100) : 0,
        scheduled: v.scheduled,
        present: v.present,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalScheduled = shifts.length;
    const totalPresent = shifts.filter((s) =>
      ["completed", "in_progress", "on_leave"].includes(s.derived_status ?? ""),
    ).length;
    const attendanceRatePct =
      totalScheduled > 0 ? Math.round((totalPresent / totalScheduled) * 100) : null;

    // ── Exceptions ───────────────────────────────────────────────────
    // Build staff_record_id → display_name map from already-fetched profiles
    const staffRecordToName = new Map<string, string>();
    for (const p of profiles) {
      if (p.staff_record_id) {
        staffRecordToName.set(p.staff_record_id, p.display_name ?? "Unknown");
      }
    }

    const exceptions = exceptionsResult.data ?? [];
    const exTypeMap = new Map<string, number>();
    const exStaffMap = new Map<string, { name: string; count: number }>();
    for (const e of exceptions) {
      const t = e.type ?? "unknown";
      exTypeMap.set(t, (exTypeMap.get(t) ?? 0) + 1);

      const staffId = e.staff_record_id;
      if (staffId) {
        const name = staffRecordToName.get(staffId) ?? "Unknown";
        const ex = exStaffMap.get(staffId) ?? { name, count: 0 };
        ex.count += 1;
        exStaffMap.set(staffId, ex);
      }
    }
    const exceptionsByType: ExceptionByType[] = Array.from(exTypeMap.entries())
      .map(([type, count]) => ({ type, label: EXCEPTION_LABELS[type] ?? type, count }))
      .sort((a, b) => b.count - a.count);

    const exceptionLeaderboard: ExceptionLeaderEntry[] = Array.from(exStaffMap.entries())
      .map(([staffRecordId, v]) => ({ staffRecordId, displayName: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ── Leave utilization ────────────────────────────────────────────
    const leaveBalances = (leaveBalancesResult.data ?? []).filter(
      (lb) => (lb.fiscal_year as number) === fiscalYear,
    );
    let totalAccrued = 0;
    let totalUsed = 0;
    for (const lb of leaveBalances) {
      totalAccrued += Number(lb.accrued_days);
      totalUsed += Math.abs(Number(lb.used_days));
    }
    const avgLeaveUtilPct = totalAccrued > 0 ? Math.round((totalUsed / totalAccrued) * 100) : null;

    // ── Department distribution ───────────────────────────────────────
    const departmentDistribution: DepartmentCount[] = (orgUnitsResult.data ?? [])
      .map((ou) => {
        const staffRecs = ou.staff_records as { id: string }[] | null;
        return {
          orgUnitId: ou.id,
          orgUnitName: ou.name,
          staffCount: staffRecs?.length ?? 0,
        };
      })
      .filter((d) => d.staffCount > 0)
      .sort((a, b) => b.staffCount - a.staffCount);

    return {
      periodFrom: bounds.from,
      periodTo: bounds.to,
      totalActive,
      byAccessLevel,
      newHires: newHiresResult.count ?? 0,
      departures,
      onLeave,
      attendanceRatePct,
      attendanceTrend,
      exceptionsByType,
      exceptionLeaderboard,
      avgLeaveUtilPct,
      departmentDistribution,
    };
  },
);
