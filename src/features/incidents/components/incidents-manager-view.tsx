"use client";

import * as React from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";

import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FilterableDataTable } from "@/components/shared/filterable-data-table";

import { IncidentReportForm } from "@/features/incidents/components/incident-report-form";
import { IncidentResolveDialog } from "@/features/incidents/components/incident-resolve-dialog";
import {
  IncidentFilters,
  useIncidentGroupFilter,
} from "@/features/incidents/components/incident-filters";
import { IncidentsKpiBar } from "@/features/incidents/components/incidents-kpi-bar";
import { useIncidentColumns } from "@/features/incidents/components/use-incident-columns";
import { categoryToGroup, type IncidentGroupKey } from "@/features/incidents/constants";
import type { IncidentRow } from "@/features/incidents/queries/list-incidents";
import type { ZoneOption } from "@/features/incidents/queries/list-zones";

export type IncidentsManagerViewProps = Readonly<{
  incidents: readonly IncidentRow[];
  allowedGroups: readonly IncidentGroupKey[];
  zones: readonly ZoneOption[];
  canResolve: boolean;
}>;

/**
 * Manager client leaf for `/management/operations/incidents` and
 * `/management/maintenance/incidents`. Identical interaction; different
 * `allowedGroups` (and therefore different KPI bar + table contents)
 * injected by the route wrapper per ADR-0007.
 *
 * Composition follows the audit reference: `<FilterableDataTable>`
 * wraps toolbar + table in one Premium Frame; `<IncidentFilters>` is
 * the toolbar (status tabs + group select + Report action).
 */
export function IncidentsManagerView({
  incidents,
  allowedGroups,
  zones,
  canResolve,
}: IncidentsManagerViewProps) {
  // `status` is URL-bound (same `status` param that `<StatusTabBar>`
  // inside `<IncidentFilters>` writes). We read + write it directly here
  // so the post-resolve auto-switch ("flip to Resolved tab after a
  // successful resolve") can nudge the tab.
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringEnum(["open", "resolved"]).withDefault("open"),
  );
  const groupFilter = useIncidentGroupFilter(allowedGroups);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [resolveTarget, setResolveTarget] = React.useState<IncidentRow | null>(null);

  const { openCount, resolvedCount } = React.useMemo(() => {
    let o = 0;
    let r = 0;
    for (const inc of incidents) {
      if (inc.status === "open") o++;
      else r++;
    }
    return { openCount: o, resolvedCount: r };
  }, [incidents]);

  const visible = React.useMemo(() => {
    return incidents.filter((inc) => {
      if (inc.status !== status) return false;
      if (!groupFilter) return true;
      return categoryToGroup(inc.category) === groupFilter;
    });
  }, [incidents, status, groupFilter]);

  const handleResolveClick = React.useCallback((inc: IncidentRow) => {
    setResolveTarget(inc);
  }, []);

  const closeResolve = React.useCallback(() => setResolveTarget(null), []);

  const columns = useIncidentColumns({ canResolve, onResolveClick: handleResolveClick });

  return (
    <div className="flex flex-col gap-6">
      <IncidentsKpiBar
        incidents={incidents}
        allowedGroups={allowedGroups}
        categoryToGroup={categoryToGroup}
      />

      <FilterableDataTable<IncidentRow>
        data-testid="incidents-table"
        toolbar={
          <IncidentFilters
            allowedGroups={allowedGroups}
            openCount={openCount}
            resolvedCount={resolvedCount}
            onReportClick={() => setReportOpen(true)}
          />
        }
        hasActiveFilters={Boolean(groupFilter)}
        table={{
          data: visible,
          columns,
          mobileFieldPriority: ["category", "description", "zone", "created_at"],
          getRowId: (row) => row.id,
        }}
        emptyState={
          <EmptyStateCta
            variant={incidents.length === 0 ? "first-use" : "filtered-out"}
            title={
              incidents.length === 0
                ? "No incidents yet"
                : status === "open"
                  ? "No open incidents"
                  : "No resolved incidents"
            }
            description={
              incidents.length === 0
                ? "Good — nothing to triage. Report one here if something comes up."
                : "Try a different status tab or group filter."
            }
            data-testid="incidents-empty"
          />
        }
      />

      <Sheet open={reportOpen} onOpenChange={setReportOpen}>
        <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Report an incident</SheetTitle>
            <SheetDescription>
              Describe what happened. Attach a photo or PDF if it helps triage.
            </SheetDescription>
          </SheetHeader>
          <div className="p-6">
            <IncidentReportForm
              allowedGroups={allowedGroups}
              zones={zones}
              onComplete={() => setReportOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {resolveTarget ? (
        <IncidentResolveDialog
          open={Boolean(resolveTarget)}
          onOpenChange={(o) => {
            if (!o) closeResolve();
          }}
          incidentId={resolveTarget.id}
          incidentSummary={`${resolveTarget.description.slice(0, 200)}`}
          onResolved={() => {
            closeResolve();
            // Flip the tab to "Resolved" so the user sees the row they
            // just resolved rather than an empty open list.
            if (status !== "resolved") void setStatus("resolved");
          }}
        />
      ) : null}
    </div>
  );
}
