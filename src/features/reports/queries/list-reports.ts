import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ReportType } from "@/features/reports/constants";

export type SavedReport = Readonly<{
  id: string;
  reportType: ReportType;
  parameters: Record<string, unknown>;
  scheduleCron: string | null;
  recipients: readonly string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
}>;

/**
 * List the caller's saved report configs — the "My scheduled reports"
 * section. `reports_select` RLS gates on `reports:r` universally; we
 * narrow to `created_by = auth.uid()` at the app layer so each user
 * sees only the schedules they own.
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup.
 */
export const listSavedReports = cache(async (userId: string): Promise<SavedReport[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, report_type, parameters, schedule_cron, recipients, is_active, created_at, updated_at, created_by",
    )
    .eq("created_by", userId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    reportType: row.report_type as ReportType,
    parameters: (row.parameters ?? {}) as Record<string, unknown>,
    scheduleCron: row.schedule_cron,
    recipients: Array.isArray(row.recipients) ? (row.recipients as string[]) : [],
    isActive: row.is_active ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  }));
});
