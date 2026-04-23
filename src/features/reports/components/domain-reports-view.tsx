"use client";

import * as React from "react";

import { EmptyState } from "@/components/ui/empty-state";

import { ExecutionHistoryTable } from "@/features/reports/components/execution-history-table";
import { ReportGenerator } from "@/features/reports/components/report-generator";
import { ScheduleForm } from "@/features/reports/components/schedule-form";
import { ScheduleList } from "@/features/reports/components/schedule-list";
import type { ReportType } from "@/features/reports/constants";
import type { ReportExecution } from "@/features/reports/queries/list-executions";
import type { SavedReport } from "@/features/reports/queries/list-reports";

export type DomainReportsViewProps = Readonly<{
  allowedReportTypes: readonly ReportType[];
  schedules: readonly SavedReport[];
  executions: readonly ReportExecution[];
}>;

/**
 * Reports client leaf. Three stacked cards rendered for every user on
 * the page:
 *   1. Ad-hoc generator.
 *   2. Scheduled reports list + inline edit form.
 *   3. Execution history table.
 *
 * All managers/admins see the same surface — only the injected
 * `allowedReportTypes` differs per role. Users who lack the grants
 * required by a specific action (e.g. `reports:c` for saving a
 * schedule) get a clean FORBIDDEN toast from the Server Action layer.
 */
export function DomainReportsView({
  allowedReportTypes,
  schedules,
  executions,
}: DomainReportsViewProps) {
  const [editing, setEditing] = React.useState<SavedReport | "new" | null>(null);

  const resetEditor = React.useCallback(() => setEditing(null), []);

  if (allowedReportTypes.length === 0) {
    return (
      <EmptyState
        variant="first-use"
        title="No reports available for your domains"
        description="Ask an admin to grant you read access on the domain whose reports you need."
        data-testid="reports-no-access"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ReportGenerator allowedReportTypes={allowedReportTypes} />

      {editing === "new" ? (
        <ScheduleForm
          allowedReportTypes={allowedReportTypes}
          onComplete={resetEditor}
          onCancel={resetEditor}
        />
      ) : editing ? (
        <ScheduleForm
          initial={editing}
          allowedReportTypes={allowedReportTypes}
          onComplete={resetEditor}
          onCancel={resetEditor}
        />
      ) : (
        <ScheduleList
          schedules={schedules}
          onEdit={(s) => setEditing(s)}
          onCreate={() => setEditing("new")}
        />
      )}

      <ExecutionHistoryTable executions={executions} />
    </div>
  );
}
