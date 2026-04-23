import { PageHeader } from "@/components/ui/page-header";

import { DomainReportsView } from "@/features/reports/components/domain-reports-view";
import type { ReportType } from "@/features/reports/constants";
import type { ReportExecution } from "@/features/reports/queries/list-executions";
import type { SavedReport } from "@/features/reports/queries/list-reports";

/**
 * Shared `DomainReportsPage` — Universal Pattern C
 * ([ADR-0007](../../../docs/adr/0007-universal-pattern-c.md)).
 *
 * Every user with `reports:r` sees the same page shape — generator +
 * scheduler + execution history. Only `allowedReportTypes` differs by
 * role:
 *   - Admins with `system:r` → every report type.
 *   - Managers → types whose owning domain(s) they hold `r` on.
 *
 * Spec anchor: frontend_spec.md §6 · DomainReportsPage (lines
 * 3971-4001 + 4182-4234).
 */

export interface DomainReportsPageProps {
  /** Resolved from the caller's JWT domain set via
   *  `resolveAllowedReportTypes`. Admins with `system:r` get every type. */
  allowedReportTypes: readonly ReportType[];
  /** Caller's saved report configs (includes paused ones). */
  schedules: readonly SavedReport[];
  /** Last 50 executions tied to the caller's reports. */
  executions: readonly ReportExecution[];
}

export function DomainReportsPage({
  allowedReportTypes,
  schedules,
  executions,
}: Readonly<DomainReportsPageProps>) {
  return (
    <div className="flex flex-col gap-6" data-testid="domain-reports-page">
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        description="Generate one-off reports or schedule recurring ones. Recipients get the CSV by email; downloads stay live for 7 days."
        data-testid="domain-reports-page-header"
      />
      <DomainReportsView
        allowedReportTypes={allowedReportTypes}
        schedules={schedules}
        executions={executions}
      />
    </div>
  );
}
