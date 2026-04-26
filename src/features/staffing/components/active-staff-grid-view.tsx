"use client";

import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Users } from "lucide-react";

import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiCardRow } from "@/components/ui/kpi-card-row";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SearchInput } from "@/components/ui/search-input";

import { StaffCard } from "@/features/staffing/components/staff-card";
import type { ActiveStaffRow } from "@/features/staffing/queries/list-active-staff";

export type ActiveStaffGridViewProps = Readonly<{
  rows: readonly ActiveStaffRow[];
}>;

const NUQS_OPTS = {
  clearOnDefault: true,
  history: "replace" as const,
  // Filtering is client-side (the active list is bounded), so the URL
  // sync stays shallow — server doesn't need to re-fetch.
  shallow: true as const,
};

/**
 * Client leaf for `/management/staffing`. Two filters over the
 * RSC-fetched active-staff list:
 *   1. Role — `<SearchableSelect>` over the roles represented in the
 *      current active set. "All roles" (null) shows everyone.
 *   2. Name / employee-ID search — substring match on `display_name`
 *      or `employee_id`, debounced via `<SearchInput>`.
 *
 * Filters are URL-bound via `nuqs` so a deep-link like
 * `?role=ROL_HOST&q=alice` reproduces the exact filter state on reload.
 *
 * Filter chrome is the canonical `<FilterBar>` (matches the audit /
 * incidents pattern). The grid itself is intentional — staff cards
 * carry photo + role + zone + clock-in time, which read better as
 * tiles than as table rows.
 *
 * All filtering is client-side — the full list already fit through
 * the RSC payload (active staff is bounded by park headcount × shift
 * overlap, typically <200 at peak). Server-side filtering becomes
 * worthwhile at 10× that scale; re-architect then.
 */
export function ActiveStaffGridView({ rows }: ActiveStaffGridViewProps) {
  const [roleFilter, setRoleFilter] = useQueryState("role", parseAsString.withOptions(NUQS_OPTS));
  const [search, setSearch] = useQueryState("q", parseAsString.withOptions(NUQS_OPTS));

  const roleOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      if (r.roleId && r.roleDisplayName && !seen.has(r.roleId)) {
        seen.set(r.roleId, r.roleDisplayName);
      }
    }
    return Array.from(seen, ([id, label]) => ({ value: id, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [rows]);

  const needle = (search ?? "").trim().toLowerCase();

  const visible = React.useMemo(() => {
    return rows.filter((r) => {
      if (roleFilter && r.roleId !== roleFilter) return false;
      if (needle) {
        const hay = `${r.displayName ?? ""} ${r.employeeId ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, roleFilter, needle]);

  const roleBreakdown = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const label = r.roleDisplayName ?? "Unassigned";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  const activeFiltersCount = (roleFilter ? 1 : 0) + (needle ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;

  const clearAll = (): void => {
    void setRoleFilter(null);
    void setSearch(null);
  };

  const roleLabel = roleFilter
    ? (roleOptions.find((opt) => opt.value === roleFilter)?.label ?? roleFilter)
    : null;

  const chips: React.ReactNode[] = [];
  if (roleLabel) {
    chips.push(
      <FilterChip
        key="role"
        name="Role"
        label={roleLabel}
        onRemove={() => void setRoleFilter(null)}
        data-testid="staffing-filter-chip-role"
      />,
    );
  }
  if (needle) {
    chips.push(
      <FilterChip
        key="search"
        name="Search"
        label={needle}
        onRemove={() => void setSearch(null)}
        data-testid="staffing-filter-chip-search"
      />,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <KpiCardRow data-testid="staffing-kpis">
        <KpiCard
          label="On-site now"
          value={rows.length}
          icon={<Users aria-hidden className="size-4" />}
          emphasis={rows.length > 0 ? "accent" : "default"}
          data-testid="staffing-kpi-total"
        />
        <KpiCard
          label="Distinct roles"
          value={roleBreakdown.size}
          data-testid="staffing-kpi-roles"
        />
        <KpiCard
          label="Showing"
          value={visible.length}
          caption={
            activeFiltersCount > 0
              ? `${activeFiltersCount} filter${activeFiltersCount === 1 ? "" : "s"} active`
              : "No filters"
          }
          data-testid="staffing-kpi-showing"
        />
      </KpiCardRow>

      <FilterBar
        data-testid="staffing-filters"
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAll}
        search={
          <SearchInput
            value={search ?? ""}
            onChange={(next) => {
              const trimmed = next.trim();
              void setSearch(trimmed.length > 0 ? trimmed : null);
            }}
            placeholder="Search by name or employee ID"
            aria-label="Search by name or employee ID"
            debounceMs={250}
            data-testid="staffing-name-search"
          />
        }
        controls={
          <SearchableSelect
            value={roleFilter}
            onChange={(next) => void setRoleFilter(next)}
            options={roleOptions}
            placeholder={roleOptions.length === 0 ? "No active roles to filter" : "Any role"}
            searchPlaceholder="Search roles…"
            emptyLabel="No roles match."
            clearable
            disabled={roleOptions.length === 0}
            aria-label="Role filter"
            data-testid="staffing-role-filter"
            className="min-w-[14rem] sm:w-auto"
          />
        }
        chips={chips.length > 0 ? chips : null}
      />

      {rows.length === 0 ? (
        <EmptyStateCta
          variant="first-use"
          title="No one is clocked in right now"
          description="When staff start their shifts, they'll appear here live."
          data-testid="staffing-empty-noone"
        />
      ) : visible.length === 0 ? (
        <EmptyStateCta
          variant="filtered-out"
          title="No staff match your filters"
          description="Try a different role or clear the search."
          data-testid="staffing-empty-filtered"
        />
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          data-testid="staffing-grid"
        >
          {visible.map((row) => (
            <StaffCard key={row.staffRecordId} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
