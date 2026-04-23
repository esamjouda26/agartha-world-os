import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ReportType } from "@/features/reports/constants";

export type ExecutionStatus = "processing" | "completed" | "failed";

export type ReportExecution = Readonly<{
  id: string;
  reportId: string;
  reportType: ReportType | null;
  status: ExecutionStatus;
  rowCount: number;
  fileUrl: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByName: string;
}>;

const EXECUTION_HISTORY_LIMIT = 50;

/**
 * List recent execution attempts — both ad-hoc "generate now" runs and
 * automated cron runs for the caller's scheduled reports.
 *
 * Scoped via `reports.created_by = auth.uid()` applied on the join,
 * so one user doesn't see executions triggered by other staff. Admins
 * can still see their own; a future "admin view all" is a Phase 7 add.
 */
export const listRecentExecutions = cache(async (userId: string): Promise<ReportExecution[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("report_executions")
    .select(
      "id, report_id, status, row_count, file_url, error_message, started_at, completed_at, created_at, created_by, reports:reports!inner(report_type, created_by)",
    )
    .eq("reports.created_by", userId)
    .order("created_at", { ascending: false })
    .limit(EXECUTION_HISTORY_LIMIT);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Resolve user display names for `created_by` — single round-trip.
  const creatorIds = Array.from(
    new Set(data.map((r) => r.created_by).filter((v): v is string => v !== null)),
  );
  const displayNameById = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (pErr) throw pErr;
    for (const p of profiles ?? []) displayNameById.set(p.id, p.display_name ?? "");
  }

  return data.map((row) => {
    // `reports` is returned as a single object due to `!inner` + PK join,
    // but the typed signature defaults to array. Narrow explicitly.
    const reportJoin = Array.isArray(row.reports) ? row.reports[0] : row.reports;
    return {
      id: row.id,
      reportId: row.report_id,
      reportType: (reportJoin?.report_type as ReportType | undefined) ?? null,
      status: (row.status ?? "processing") as ExecutionStatus,
      rowCount: row.row_count ?? 0,
      fileUrl: row.file_url,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      createdBy: row.created_by,
      createdByName: row.created_by ? (displayNameById.get(row.created_by) ?? "") : "",
    };
  });
});
