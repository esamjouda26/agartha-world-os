"use client";

import * as React from "react";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusTabBar } from "@/components/ui/status-tab-bar";

import { GROUP_LABEL, type IncidentGroupKey } from "@/features/incidents/constants";

export type IncidentFiltersProps = Readonly<{
  allowedGroups: readonly IncidentGroupKey[];
  openCount: number;
  resolvedCount: number;
  /** Fires when "Report incident" is pressed. */
  onReportClick: () => void;
}>;

const NUQS_OPTS = {
  clearOnDefault: true,
  history: "replace" as const,
  // `shallow: false` ensures the RSC page re-fetches when the group
  // filter changes — otherwise the client `useMemo` filter runs over
  // stale data.
  shallow: false as const,
};

/**
 * IncidentFilters — toolbar wrapper for the incidents list.
 *
 * Renders:
 *   - `<StatusTabBar>` (open / resolved) in the controls slot — always
 *     URL-bound via its own `paramKey`.
 *   - Group `<Select>` in the controls slot — URL-bound via `nuqs` so
 *     the server-side filter narrows on reload.
 *   - "Report incident" primary action in the `moreAction` slot.
 *   - Active filter chips with × for per-filter removal.
 *
 * Mirrors the audit page's `<AuditFilters>` ergonomic: filters + primary
 * action live inside the `<FilterableDataTable>`'s Premium Frame so the
 * surface reads as one contiguous card.
 */
export function IncidentFilters({
  allowedGroups,
  openCount,
  resolvedCount,
  onReportClick,
}: IncidentFiltersProps) {
  // `group` is a plain nuqs string bounded client-side to `allowedGroups`.
  // parseAsStringEnum would require a const-array of literal values, but
  // the allowed set is runtime-computed from the user's RBAC claims.
  const [group, setGroup] = useQueryState("group", parseAsString.withOptions(NUQS_OPTS));

  const resolvedGroup: IncidentGroupKey | null =
    group && (allowedGroups as readonly string[]).includes(group)
      ? (group as IncidentGroupKey)
      : null;

  const handleGroupChange = (next: string): void => {
    if (next === "all" || next === "") {
      void setGroup(null);
      return;
    }
    void setGroup(next);
  };

  const resetAll = (): void => {
    void setGroup(null);
  };

  const hasActiveFilters = Boolean(resolvedGroup);

  const chips: React.ReactNode[] = [];
  if (resolvedGroup) {
    chips.push(
      <FilterChip
        key="group"
        name="Group"
        label={GROUP_LABEL[resolvedGroup]}
        onRemove={() => void setGroup(null)}
        data-testid="incidents-filter-chip-group"
      />,
    );
  }

  return (
    <FilterBar
      data-testid="incidents-filters"
      hasActiveFilters={hasActiveFilters}
      onClearAll={resetAll}
      controls={
        <>
          <StatusTabBar
            ariaLabel="Incident status filter"
            defaultValue="open"
            paramKey="status"
            tabs={[
              { value: "open", label: "Open", count: openCount },
              { value: "resolved", label: "Resolved", count: resolvedCount },
            ]}
            data-testid="incidents-status-tabs"
          />
          <Select value={resolvedGroup ?? "all"} onValueChange={handleGroupChange}>
            <SelectTrigger
              className="h-10 min-w-48 sm:w-auto"
              aria-label="Group filter"
              data-testid="incidents-group-filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {allowedGroups.map((g) => (
                <SelectItem key={g} value={g}>
                  {GROUP_LABEL[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
      moreAction={
        <Button type="button" onClick={onReportClick} data-testid="incidents-report-trigger">
          <Plus aria-hidden className="size-4" />
          <span>Report incident</span>
        </Button>
      }
      chips={chips.length > 0 ? chips : null}
    />
  );
}

/**
 * Hook — exposes the current group filter for the parent list view so
 * it can narrow incidents client-side. The filter is URL-bound via the
 * same `group` nuqs key that `<IncidentFilters>` writes, keeping state
 * colocated between renderer and consumer.
 */
export function useIncidentGroupFilter(
  allowedGroups: readonly IncidentGroupKey[],
): IncidentGroupKey | null {
  const [group] = useQueryState("group", parseAsString.withOptions(NUQS_OPTS));
  if (!group) return null;
  return (allowedGroups as readonly string[]).includes(group) ? (group as IncidentGroupKey) : null;
}

/** Hook — exposes the current status filter (URL-bound via StatusTabBar). */
export function useIncidentStatusFilter(): "open" | "resolved" {
  const [status] = useQueryState(
    "status",
    parseAsStringEnum(["open", "resolved"]).withDefault("open"),
  );
  return status;
}
