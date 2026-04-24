import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Result shape for the IAM Ledger page. Contains the full request list
 * with joined staff + role names, and KPI aggregates.
 *
 * Cache model (ADR-0006): React `cache()` only — request-scoped dedup.
 * RLS-scoped reads cannot use `unstable_cache`.
 */
export type IamLedgerData = Readonly<{
  requests: ReadonlyArray<IamRequestRow>;
  kpis: IamKpis;
  /** Tab counts keyed by status. */
  statusCounts: Readonly<Record<string, number>>;
}>;

export type IamRequestRow = Readonly<{
  id: string;
  requestType: string;
  status: string;
  staffName: string;
  staffRecordId: string;
  targetRoleName: string | null;
  currentRoleName: string | null;
  hrRemark: string | null;
  createdAt: string;
  updatedAt: string | null;
}>;

export type IamKpis = Readonly<{
  pendingCount: number;
  approvedTodayCount: number;
  avgWaitMs: number | null;
}>;

export const getIamLedger = cache(
  async (client: SupabaseClient<Database>): Promise<IamLedgerData> => {
    // ── Fetch all IAM requests with joins ───────────────────────────────
    const { data: requests, error: reqErr } = await client
      .from("iam_requests")
      .select(
        `id, request_type, status, hr_remark, created_at, updated_at,
         staff_record_id,
         staff_records!iam_requests_staff_record_id_fkey ( legal_name ),
         target_role:roles!iam_requests_target_role_id_fkey ( display_name ),
         current_role:roles!iam_requests_current_role_id_fkey ( display_name )`,
      )
      .order("created_at", { ascending: true });

    if (reqErr) throw reqErr;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // ── Map to view model + compute KPIs ────────────────────────────────
    let pendingCount = 0;
    let approvedTodayCount = 0;
    const pendingCreatedAts: number[] = [];
    const statusCounts: Record<string, number> = {};

    const rows: IamRequestRow[] = (requests ?? []).map((r) => {
      const status = r.status ?? "pending_it";
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;

      if (status === "pending_it") {
        pendingCount++;
        pendingCreatedAts.push(new Date(r.created_at).getTime());
      }

      if (status === "approved" && r.updated_at && r.updated_at >= todayStart) {
        approvedTodayCount++;
      }

      // Supabase returns joined FK as object or null
      const staffRecord = r.staff_records as { legal_name: string } | null;
      const targetRole = r.target_role as { display_name: string } | null;
      const currentRole = r.current_role as { display_name: string } | null;

      return {
        id: r.id,
        requestType: r.request_type,
        status,
        staffName: staffRecord?.legal_name ?? "Unknown",
        staffRecordId: r.staff_record_id,
        targetRoleName: targetRole?.display_name ?? null,
        currentRoleName: currentRole?.display_name ?? null,
        hrRemark: r.hr_remark,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    // Avg wait time for pending requests
    const avgWaitMs =
      pendingCreatedAts.length > 0
        ? Math.round(
            pendingCreatedAts.reduce((sum, t) => sum + (now.getTime() - t), 0) /
              pendingCreatedAts.length,
          )
        : null;

    return {
      requests: rows,
      kpis: {
        pendingCount,
        approvedTodayCount,
        avgWaitMs,
      },
      statusCounts,
    };
  },
);
