"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useIncidentColumns } from "@/features/incidents/components/use-incident-columns";
import type { IncidentGroupKey } from "@/features/incidents/constants";
import type { IncidentRow } from "@/features/incidents/queries/list-incidents";
import type { ZoneOption } from "@/features/incidents/queries/list-zones";

export type IncidentsCrewViewProps = Readonly<{
  incidents: readonly IncidentRow[];
  allowedGroups: readonly IncidentGroupKey[];
  zones: readonly ZoneOption[];
}>;

const noopResolve = (): void => {
  // Crew cannot resolve — the columns hook guards on `canResolve: false`
  // and suppresses the action button entirely, so this handler is never
  // actually reached. Provided to satisfy the columns contract.
};

/**
 * Crew client leaf for `/crew/incidents`. Simplified surface: a
 * report-new CTA + a short summary ("Open: N · Resolved: N") above the
 * user's own incidents. Crew cannot resolve.
 */
export function IncidentsCrewView({ incidents, allowedGroups, zones }: IncidentsCrewViewProps) {
  const [reportOpen, setReportOpen] = React.useState(false);
  const { open, resolved } = React.useMemo(() => {
    let o = 0;
    let r = 0;
    for (const inc of incidents) {
      if (inc.status === "open") o++;
      else r++;
    }
    return { open: o, resolved: r };
  }, [incidents]);

  const columns = useIncidentColumns({ canResolve: false, onResolveClick: noopResolve });

  return (
    <div className="flex flex-col gap-5">
      <Card data-testid="incidents-crew-summary">
        <CardHeader>
          <CardTitle>Your reports</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="text-foreground-muted text-sm">
            <span className="text-foreground font-semibold">{open}</span> open ·{" "}
            <span className="text-foreground font-semibold">{resolved}</span> resolved
          </div>
          <Button
            type="button"
            onClick={() => setReportOpen(true)}
            data-testid="incidents-crew-report-trigger"
          >
            <Plus aria-hidden className="size-4" />
            <span>Report incident</span>
          </Button>
        </CardContent>
      </Card>

      <FilterableDataTable<IncidentRow>
        data-testid="incidents-crew-table"
        table={{
          data: incidents,
          columns,
          mobileFieldPriority: ["category", "description", "zone", "created_at"],
          getRowId: (row) => row.id,
        }}
        emptyState={
          <EmptyStateCta
            variant="first-use"
            title="No incidents reported yet"
            description="Noticed something unsafe or unusual? Use the Report incident button above."
            data-testid="incidents-crew-empty"
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
    </div>
  );
}
