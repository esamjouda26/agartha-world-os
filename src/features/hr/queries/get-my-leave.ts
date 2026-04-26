import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type LeaveBalanceRow = Readonly<{
  leaveTypeId: string | null;
  leaveTypeName: string | null;
  leaveTypeCode: string | null;
  accruedDays: number | null;
  carryForwardDays: number | null;
  adjustmentDays: number | null;
  usedDays: number | null;
  forfeitureDays: number | null;
  balance: number | null;
  isPaid: boolean | null;
}>;

export type LeaveRequestRow = Readonly<{
  id: string;
  leaveTypeId: string | null;
  leaveTypeName: string | null;
  startDate: string;
  endDate: string;
  requestedDays: number;
  status: string;
  reason: string | null;
  createdAt: string;
}>;

export type LeaveType = Readonly<{ id: string; name: string; code: string }>;

export type MyLeaveData = Readonly<{
  staffRecordId: string;
  balances: ReadonlyArray<LeaveBalanceRow>;
  requests: ReadonlyArray<LeaveRequestRow>;
  leaveTypes: ReadonlyArray<LeaveType>;
}>;

/**
 * Fetch the caller's leave balances + request history + leave type dropdown.
 * init_schema.sql:1560 — leave_requests; view v_leave_balances.
 * Cache model (ADR-0006): React cache() — per-request dedup only.
 */
export const getMyLeave = cache(
  async (
    client: SupabaseClient<Database>,
    userId: string,
    filters: Readonly<{ year?: number; leaveTypeId?: string; pastStatus?: string }>,
  ): Promise<MyLeaveData | null> => {
    const { data: profile } = await client
      .from("profiles")
      .select("staff_record_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.staff_record_id) return null;

    const [balancesRes, requestsRes, typesRes] = await Promise.all([
      client
        .from("v_leave_balances")
        .select(
          "leave_type_id, leave_type_name, leave_type_code, accrued_days, carry_forward_days, adjustment_days, used_days, forfeiture_days, balance, is_paid",
        )
        .eq("staff_record_id", profile.staff_record_id),
      (async () => {
        let q = client
          .from("leave_requests")
          .select(
            "id, leave_type_id, start_date, end_date, requested_days, status, reason, created_at, leave_types(name)",
          )
          // staff_record_id is non-null (checked above); TypeScript can't narrow through async closure.
          .eq("staff_record_id", profile.staff_record_id as string)
          .order("created_at", { ascending: false });

        if (filters.year) {
          q = q
            .gte("start_date", `${filters.year}-01-01`)
            .lte("start_date", `${filters.year}-12-31`);
        }
        if (filters.leaveTypeId) q = q.eq("leave_type_id", filters.leaveTypeId as string);
        if (filters.pastStatus) {
          // Cast through unknown to satisfy the leave_request_status enum constraint
          q = q.eq(
            "status",
            filters.pastStatus as "pending" | "approved" | "rejected" | "cancelled",
          );
        }

        return q;
      })(),
      client.from("leave_types").select("id, name, code").order("name"),
    ]);

    if (balancesRes.error) throw balancesRes.error;
    if (requestsRes.error) throw requestsRes.error;
    if (typesRes.error) throw typesRes.error;

    const balances: LeaveBalanceRow[] = (balancesRes.data ?? []).map((b) => ({
      leaveTypeId: b.leave_type_id,
      leaveTypeName: b.leave_type_name,
      leaveTypeCode: b.leave_type_code,
      accruedDays: b.accrued_days,
      carryForwardDays: b.carry_forward_days,
      adjustmentDays: b.adjustment_days,
      usedDays: b.used_days,
      forfeitureDays: b.forfeiture_days,
      balance: b.balance,
      isPaid: b.is_paid,
    }));

    const requests: LeaveRequestRow[] = (requestsRes.data ?? []).map((r) => {
      const lt = r.leave_types as { name: string } | null;
      return {
        id: r.id,
        leaveTypeId: r.leave_type_id,
        leaveTypeName: lt?.name ?? null,
        startDate: r.start_date,
        endDate: r.end_date,
        requestedDays: r.requested_days,
        status: r.status,
        reason: r.reason,
        createdAt: r.created_at,
      };
    });

    return {
      staffRecordId: profile.staff_record_id,
      balances,
      requests,
      leaveTypes: (typesRes.data ?? []).map((t) => ({ id: t.id, name: t.name, code: t.code })),
    };
  },
);
