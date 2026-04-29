import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  LeaveRequestRow,
  LeaveBalanceRow,
  LeaveLedgerRow,
  LeaveTypeRow,
  LeavePolicyRow,
  LeaveManagementData,
  LeaveRequestPage,
  LeaveLedgerPage,
} from "@/features/hr/types/leave-management";
import type { LeaveManagementFilters } from "@/features/hr/schemas/leave-management-filters";
import {
  decodeLeaveRequestCursor,
  LEAVE_DEFAULT_PAGE_SIZE,
} from "@/features/hr/schemas/leave-management-filters";

/**
 * RSC query — all data for `/management/hr/attendance/leaves`.
 *
 * Server-side keyset cursor pagination on the Requests and History tabs.
 * Balances, Policies, and Types are fetched in full (small datasets).
 *
 * NOTE: `profiles.staff_record_id` → `staff_records.id` (indirect mapping via FK).
 */
export const getLeaveManagementData = cache(
  async (
    client: SupabaseClient<Database>,
    filters: LeaveManagementFilters,
  ): Promise<LeaveManagementData> => {
    const pageSize = filters.pageSize ?? LEAVE_DEFAULT_PAGE_SIZE;
    const requestCursor = decodeLeaveRequestCursor(filters.cursor);
    const historyCursor = decodeLeaveRequestCursor(filters.historyCursor);

    // ── 1. Build paginated requests query ──────────────────────────────
    let requestsBuilder = client
      .from("leave_requests")
      .select(
        "id, staff_record_id, leave_type_id, start_date, end_date, requested_days, reason, status, rejection_reason, reviewed_by, reviewed_at, created_at",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (filters.status && filters.status !== "all") {
      requestsBuilder = requestsBuilder.eq(
        "status",
        filters.status as "pending" | "approved" | "rejected" | "cancelled",
      );
    }
    if (filters.leaveTypeId) {
      requestsBuilder = requestsBuilder.eq("leave_type_id", filters.leaveTypeId);
    }
    if (requestCursor) {
      requestsBuilder = requestsBuilder.or(
        `created_at.lt.${requestCursor.createdAt},and(created_at.eq.${requestCursor.createdAt},id.lt.${requestCursor.id})`,
      );
    }

    // ── 2. Build paginated ledger query ─────────────────────────────────
    let ledgerBuilder = client
      .from("leave_ledger")
      .select(
        "id, staff_record_id, leave_type_id, fiscal_year, transaction_date, transaction_type, days, notes, created_at",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (filters.leaveTypeId) {
      ledgerBuilder = ledgerBuilder.eq("leave_type_id", filters.leaveTypeId);
    }
    if (historyCursor) {
      ledgerBuilder = ledgerBuilder.or(
        `created_at.lt.${historyCursor.createdAt},and(created_at.eq.${historyCursor.createdAt},id.lt.${historyCursor.id})`,
      );
    }

    // ── 3. Parallel fetch ──────────────────────────────────────────────
    const [
      requestsRes,
      balancesRes,
      ledgerRes,
      leaveTypesRes,
      policiesRes,
      entitlementsRes,
      pendingCountRes,
    ] = await Promise.all([
      requestsBuilder,
      client
        .from("v_leave_balances")
        .select(
          "staff_record_id, leave_type_id, leave_type_name, leave_type_code, is_paid, fiscal_year, accrued_days, carry_forward_days, used_days, adjustment_days, forfeiture_days, balance",
        ),
      ledgerBuilder,
      client.from("leave_types").select("id, code, name, is_paid, is_active").order("name"),
      client.from("leave_policies").select("id, name, description, is_active").order("name"),
      client
        .from("leave_policy_entitlements")
        .select("policy_id, leave_type_id, days_per_year, frequency"),
      // Always count pending regardless of current filter
      client
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    // ── 4. Resolve staff names ─────────────────────────────────────────
    const leaveTypeMap = new Map<string, { name: string; code: string; isPaid: boolean }>();
    for (const lt of leaveTypesRes.data ?? []) {
      leaveTypeMap.set(lt.id, { name: lt.name, code: lt.code, isPaid: lt.is_paid });
    }

    const allStaffIds = new Set<string>();
    for (const r of requestsRes.data ?? [])
      if (r.staff_record_id) allStaffIds.add(r.staff_record_id);
    for (const r of balancesRes.data ?? [])
      if (r.staff_record_id) allStaffIds.add(r.staff_record_id);
    for (const r of ledgerRes.data ?? []) if (r.staff_record_id) allStaffIds.add(r.staff_record_id);

    const staffNameMap = new Map<string, string>();
    const staffIds = [...allStaffIds].filter((id): id is string => id != null);

    if (staffIds.length > 0) {
      const { data: profiles } = await client
        .from("profiles")
        .select("staff_record_id, display_name")
        .in("staff_record_id", staffIds);

      for (const p of profiles ?? []) {
        if (p.staff_record_id) staffNameMap.set(p.staff_record_id, p.display_name ?? "Unknown");
      }
    }

    // ── 5. Map requests (paginated) ────────────────────────────────────
    const rawRequests = requestsRes.data ?? [];
    const hasNextRequests = rawRequests.length > pageSize;
    const pageRequests = hasNextRequests ? rawRequests.slice(0, pageSize) : rawRequests;

    // Apply client-side search (name is resolved post-fetch)
    let requests: LeaveRequestRow[] = pageRequests.map((r) => {
      const lt = leaveTypeMap.get(r.leave_type_id ?? "");
      return {
        id: r.id,
        staffRecordId: r.staff_record_id ?? "",
        staffName: staffNameMap.get(r.staff_record_id ?? "") ?? "Unknown",
        leaveTypeId: r.leave_type_id ?? "",
        leaveTypeName: lt?.name ?? "Unknown",
        leaveTypeCode: lt?.code ?? "",
        startDate: r.start_date ?? "",
        endDate: r.end_date ?? "",
        requestedDays: Number(r.requested_days ?? 0),
        reason: r.reason ?? null,
        status: r.status,
        rejectionReason: r.rejection_reason ?? null,
        reviewedBy: r.reviewed_by ?? null,
        reviewedAt: r.reviewed_at ?? null,
        createdAt: r.created_at ?? "",
      };
    });

    if (filters.search) {
      const q = filters.search.toLowerCase();
      requests = requests.filter((r) => r.staffName.toLowerCase().includes(q));
    }

    const lastReqRow = hasNextRequests ? pageRequests[pageRequests.length - 1] : null;
    const requestsPage: LeaveRequestPage = {
      rows: requests,
      nextCursor:
        lastReqRow?.created_at && lastReqRow?.id
          ? { createdAt: lastReqRow.created_at, id: lastReqRow.id }
          : null,
    };

    // ── 6. Map balances (full set) ─────────────────────────────────────
    const balances: LeaveBalanceRow[] = (balancesRes.data ?? []).map((r) => ({
      staffRecordId: r.staff_record_id ?? "",
      staffName: staffNameMap.get(r.staff_record_id ?? "") ?? "Unknown",
      leaveTypeId: r.leave_type_id ?? "",
      leaveTypeName: r.leave_type_name ?? "",
      leaveTypeCode: r.leave_type_code ?? "",
      isPaid: r.is_paid ?? false,
      fiscalYear: r.fiscal_year ?? new Date().getFullYear(),
      accruedDays: Number(r.accrued_days ?? 0),
      carryForwardDays: Number(r.carry_forward_days ?? 0),
      usedDays: Number(r.used_days ?? 0),
      adjustmentDays: Number(r.adjustment_days ?? 0),
      forfeitureDays: Number(r.forfeiture_days ?? 0),
      balance: Number(r.balance ?? 0),
    }));

    // ── 7. Map ledger (paginated) ──────────────────────────────────────
    const rawLedger = ledgerRes.data ?? [];
    const hasNextLedger = rawLedger.length > pageSize;
    const pageLedger = hasNextLedger ? rawLedger.slice(0, pageSize) : rawLedger;

    const ledger: LeaveLedgerRow[] = pageLedger.map((r) => ({
      id: r.id,
      staffRecordId: r.staff_record_id ?? "",
      staffName: staffNameMap.get(r.staff_record_id ?? "") ?? "Unknown",
      leaveTypeId: r.leave_type_id ?? "",
      leaveTypeName: leaveTypeMap.get(r.leave_type_id ?? "")?.name ?? "Unknown",
      fiscalYear: r.fiscal_year ?? new Date().getFullYear(),
      transactionDate: r.transaction_date ?? "",
      transactionType: r.transaction_type,
      days: Number(r.days ?? 0),
      notes: r.notes ?? null,
      createdAt: r.created_at ?? "",
    }));

    const lastLedgerRow = hasNextLedger ? pageLedger[pageLedger.length - 1] : null;
    const ledgerPage: LeaveLedgerPage = {
      rows: ledger,
      nextCursor:
        lastLedgerRow?.created_at && lastLedgerRow?.id
          ? { createdAt: lastLedgerRow.created_at, id: lastLedgerRow.id }
          : null,
    };

    // ── 8. Leave types + policies (full set) ───────────────────────────
    const leaveTypes: LeaveTypeRow[] = (leaveTypesRes.data ?? []).map((lt) => ({
      id: lt.id,
      code: lt.code,
      name: lt.name,
      isPaid: lt.is_paid,
      isActive: lt.is_active,
    }));

    const entitlementsByPolicy = new Map<string, typeof entitlementsRes.data>();
    for (const e of entitlementsRes.data ?? []) {
      const list = entitlementsByPolicy.get(e.policy_id) ?? [];
      list.push(e);
      entitlementsByPolicy.set(e.policy_id, list);
    }

    const policies: LeavePolicyRow[] = (policiesRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      isActive: p.is_active,
      entitlements: (entitlementsByPolicy.get(p.id) ?? []).map((e) => ({
        leaveTypeId: e.leave_type_id,
        leaveTypeName: leaveTypeMap.get(e.leave_type_id)?.name ?? "Unknown",
        daysPerYear: Number(e.days_per_year ?? 0),
        frequency: e.frequency,
      })),
    }));

    return {
      requestsPage,
      balances,
      ledgerPage,
      policies,
      leaveTypes,
      pendingCount: pendingCountRes.count ?? 0,
      staffOptions: [...staffNameMap.entries()].map(([id, name]) => ({ id, name })),
    };
  },
);
