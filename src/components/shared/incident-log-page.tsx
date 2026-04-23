import { PageHeader } from "@/components/ui/page-header";

import { IncidentsCrewView } from "@/features/incidents/components/incidents-crew-view";
import { IncidentsManagerView } from "@/features/incidents/components/incidents-manager-view";
import type { IncidentGroupKey } from "@/features/incidents/constants";
import type { IncidentRow } from "@/features/incidents/queries/list-incidents";
import type { ZoneOption } from "@/features/incidents/queries/list-zones";

/**
 * Shared `IncidentLogPage` — Universal Pattern C
 * ([ADR-0007](../../../docs/adr/0007-universal-pattern-c.md)).
 *
 * Receives already-resolved server-side context as explicit props. Never
 * reads the JWT. Dispatches between the manager surface (tabs + KPI bar +
 * resolve action) and the crew surface (own-list summary + report-only)
 * based on `canResolve` — no abstract "mode" string per ADR-0007.
 *
 * Spec anchor: frontend_spec.md §6 · IncidentLogPage (lines 3906-3969 +
 * 4126-4180).
 */

export interface IncidentLogPageProps {
  /** Manager capability — mapped from JWT `ops:u`. Drives the resolve action
   *  and swaps in the KPI / tabs / filter chrome. */
  canResolve: boolean;
  /** Audience filter — driven by each route wrapper:
   *    /management/operations/incidents  → 5 groups (safety, medical,
   *                                         security, guest, other)
   *    /management/maintenance/incidents → 2 groups (structural, equipment)
   *    /crew/incidents                    → all 7 groups
   */
  allowedCategories: readonly IncidentGroupKey[];
  /** Filtered by `allowedCategories` + (for crew) `created_by = auth.uid()`,
   *  resolved in the route wrapper via `listIncidents()`. */
  incidents: readonly IncidentRow[];
  /** Zones for the report form's location picker. */
  zones: readonly ZoneOption[];
}

export function IncidentLogPage({
  canResolve,
  allowedCategories,
  incidents,
  zones,
}: Readonly<IncidentLogPageProps>) {
  const description = canResolve
    ? "Triage open incidents, review history, and resolve with notes."
    : "Report what you see. Your reports go to the operations team immediately.";

  return (
    <div className="flex flex-col gap-6" data-testid="incident-log-page">
      <PageHeader
        eyebrow="Operations"
        title="Incidents"
        description={description}
        data-testid="incident-log-page-header"
      />
      {canResolve ? (
        <IncidentsManagerView
          incidents={incidents}
          allowedGroups={allowedCategories}
          zones={zones}
          canResolve={canResolve}
        />
      ) : (
        <IncidentsCrewView incidents={incidents} allowedGroups={allowedCategories} zones={zones} />
      )}
    </div>
  );
}
