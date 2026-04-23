import { StandardPageShell } from "@/components/shared/standard-page-shell";

import { DomainAuditView } from "@/features/audit/components/domain-audit-view";
import type { AuditLogPage } from "@/features/audit/queries/list-audit-log";
import type { StaffFilterOption } from "@/features/audit/queries/list-staff-for-filter";

/**
 * Shared `DomainAuditTable` — Universal Pattern C
 * ([ADR-0007](../../../docs/adr/0007-universal-pattern-c.md)).
 *
 * Receives the allowed entity-type list + the current page of rows +
 * the staff filter options as explicit props. Never reads the JWT.
 *
 * Chrome is delegated to `<StandardPageShell>` so every feature page's
 * title / description / breadcrumb chrome lives in one canonical place.
 *
 * Spec anchor: frontend_spec.md §6 · DomainAuditTable (lines 4003-4027
 * + 4236-4280).
 */

export interface DomainAuditTableProps {
  /** Resolved from JWT — admins get every known entity_type, managers
   *  get the subset matching their held domains. */
  allowedEntityTypes: readonly string[];
  /** Current page of audit rows (filters + cursor applied by wrapper). */
  page: AuditLogPage;
  /** Profiles for the "performed by" filter picker. */
  staff: readonly StaffFilterOption[];
}

export function DomainAuditTable({
  allowedEntityTypes,
  page,
  staff,
}: Readonly<DomainAuditTableProps>) {
  return (
    <StandardPageShell
      data-testid="domain-audit-table"
      header={{
        eyebrow: "Compliance",
        title: "Audit log",
        description:
          "Every change to auditable records. Cursor through history, expand a row to see the field-level diff.",
        "data-testid": "domain-audit-table-header",
      }}
    >
      <DomainAuditView allowedEntityTypes={allowedEntityTypes} staff={staff} page={page} />
    </StandardPageShell>
  );
}
