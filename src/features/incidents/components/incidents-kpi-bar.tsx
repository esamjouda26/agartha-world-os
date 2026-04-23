"use client";

import * as React from "react";
import {
  AlertTriangle,
  HeartPulse,
  ShieldAlert,
  UsersRound,
  Wrench,
  HardHat,
  CircleEllipsis,
} from "lucide-react";

import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";

import { GROUP_LABEL, type IncidentGroupKey } from "@/features/incidents/constants";
import type { IncidentRow } from "@/features/incidents/queries/list-incidents";

const GROUP_ICON: Record<IncidentGroupKey, React.ReactNode> = {
  safety: <AlertTriangle className="size-4" aria-hidden />,
  medical: <HeartPulse className="size-4" aria-hidden />,
  security: <ShieldAlert className="size-4" aria-hidden />,
  guest: <UsersRound className="size-4" aria-hidden />,
  structural: <HardHat className="size-4" aria-hidden />,
  equipment: <Wrench className="size-4" aria-hidden />,
  other: <CircleEllipsis className="size-4" aria-hidden />,
};

export type IncidentsKpiBarProps = Readonly<{
  incidents: readonly IncidentRow[];
  allowedGroups: readonly IncidentGroupKey[];
  /** Resolved category → group map, injected so the bar doesn't need to
   *  import constants.ts on the client side when it already has them. */
  categoryToGroup: (cat: IncidentRow["category"]) => IncidentGroupKey;
}>;

export function IncidentsKpiBar({
  incidents,
  allowedGroups,
  categoryToGroup,
}: IncidentsKpiBarProps) {
  const openCounts = React.useMemo(() => {
    const map = new Map<IncidentGroupKey, number>();
    for (const g of allowedGroups) map.set(g, 0);
    for (const row of incidents) {
      if (row.status !== "open") continue;
      const g = categoryToGroup(row.category);
      if (!map.has(g)) continue;
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    return map;
  }, [incidents, allowedGroups, categoryToGroup]);

  return (
    <KpiCardRow data-testid="incidents-kpi-bar">
      {allowedGroups.map((g) => {
        const count = openCounts.get(g) ?? 0;
        return (
          <KpiCard
            key={g}
            label={`Open · ${GROUP_LABEL[g]}`}
            value={count}
            icon={GROUP_ICON[g]}
            emphasis={count > 0 ? "accent" : "default"}
            data-testid={`incidents-kpi-${g}`}
          />
        );
      })}
    </KpiCardRow>
  );
}
