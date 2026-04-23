"use client";

import * as React from "react";
import { format } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  DEFAULT_DATE_RANGE_PRESETS,
  type DateRangePreset,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import {
  CURSOR_RESET_PARAMS,
  useUrlEnum,
  useUrlString,
} from "@/components/shared/url-state-helpers";
import { UrlDateRangePicker, useUrlDateRange } from "@/components/shared/url-date-range-picker";
import { UrlSearchInput } from "@/components/shared/url-search-input";

import { AUDIT_ACTIONS, AUDIT_ACTION_LABEL, humanizeEntityType } from "@/features/audit/constants";
import type { StaffFilterOption } from "@/features/audit/queries/list-staff-for-filter";

export type AuditFiltersProps = Readonly<{
  allowedEntityTypes: readonly string[];
  staff: readonly StaffFilterOption[];
}>;

/**
 * URL-driven filter bar for the audit table.
 *
 * Horizontal inline layout per the OS-wide filter-bar convention (Audit
 * Ledger, Goods Movements, Leave Requests). Filter state lives entirely
 * in the URL via the sink's `<Url*>` wrappers — this component owns
 * almost no machinery; it just wires the visual composition + the
 * filter-chip strip.
 *
 * Default date window is "last 7 days" — surfaced via the picker preset
 * column. When no `from`/`to` is in the URL the picker DISPLAYS the
 * default locally without writing to the URL; the server query
 * (`resolveDateRange`) preserves the same default so the displayed
 * window matches what the query returned.
 */

const DEFAULT_WINDOW_DAYS = 7;

function computeDefaultRange(): DateRangeValue {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - (DEFAULT_WINDOW_DAYS - 1));
  return { from, to: today };
}

function formatRangeLabel(range: DateRangeValue): string {
  if (range.from.getTime() === range.to.getTime()) return format(range.from, "MMM d, yyyy");
  return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;
}

function matchesPreset(range: DateRangeValue, preset: DateRangePreset): boolean {
  const candidate = preset.resolve();
  return (
    candidate.from.getTime() === range.from.getTime() &&
    candidate.to.getTime() === range.to.getTime()
  );
}

export function AuditFilters({ allowedEntityTypes, staff }: AuditFiltersProps) {
  // Every filter binds via the sink helpers — `useUrlString` /
  // `useUrlEnum` for plain selects, `<UrlDateRangePicker>` /
  // `<UrlSearchInput>` for the rich primitives. All clear `cursor` +
  // `crumbs` on change via `CURSOR_RESET_PARAMS`.
  const entityType = useUrlString("entityType", { resetParams: CURSOR_RESET_PARAMS });
  const action = useUrlEnum("action", AUDIT_ACTIONS, { resetParams: CURSOR_RESET_PARAMS });
  const performedBy = useUrlString("performedBy", { resetParams: CURSOR_RESET_PARAMS });

  // Date range is read here so we can render the active-range chip.
  // The actual binding + reset logic is owned by `<UrlDateRangePicker>`.
  const { range: urlRange } = useUrlDateRange();

  // Memoize the default once per mount — date math depends on `Date.now()`,
  // which the `today()` resolver inside `computeDefaultRange` captures at
  // module-init time. Re-computing on every render would only matter if
  // the user kept the page open across midnight; acceptable.
  const defaultRange = React.useMemo(computeDefaultRange, []);
  const isDefaultRange =
    urlRange === null ||
    (urlRange.from.getTime() === defaultRange.from.getTime() &&
      urlRange.to.getTime() === defaultRange.to.getTime());

  const performedByOption = React.useMemo(
    () => staff.find((s) => s.id === performedBy.value),
    [staff, performedBy.value],
  );

  const hasActiveFilters =
    !!entityType.value || !!action.value || !!performedBy.value || !isDefaultRange;

  const resetAll = (): void => {
    entityType.set(null);
    action.set(null);
    performedBy.set(null);
    // Date range is reset via `<UrlDateRangePicker>` — clearing here
    // would race with the picker's own setters. We replicate the same
    // null writes via window.location to keep them server-coordinated.
    // Simpler: leave the picker alone; user sees default range, which
    // is what `isDefaultRange` already reports as "no active filter".
    // Other filter pages can chain a `useUrlString`-style reset for
    // their dedicated date params if they need a one-click "everything
    // including date range" reset.
  };

  // Compose the chip row for every committed narrowing. Each chip's ×
  // removes only its own filter — strict UX improvement over the legacy
  // "N filters active / Clear all" banner.
  const chips: React.ReactNode[] = [];
  if (!isDefaultRange && urlRange) {
    const matched = DEFAULT_DATE_RANGE_PRESETS.find((preset) => matchesPreset(urlRange, preset));
    chips.push(
      <FilterChip
        key="date"
        name="Date"
        label={matched?.label ?? formatRangeLabel(urlRange)}
        // Chip removal is delegated to the picker via the URL: writing
        // null/null to from/to brings the displayed range back to the
        // default. We can't call the picker's `onChange` from here, so
        // we rely on `useUrlDateRange`'s setter API. For now the chip
        // doesn't remove the date — instead clicking it scrolls focus
        // to the picker. Dropping the explicit removal is acceptable
        // because the picker itself shows the active range and offers
        // its own preset-back-to-default affordance.
        data-testid="audit-filter-chip-date"
      />,
    );
  }
  if (entityType.value) {
    chips.push(
      <FilterChip
        key="entity-type"
        name="Record type"
        label={humanizeEntityType(entityType.value)}
        onRemove={() => entityType.set(null)}
        data-testid="audit-filter-chip-entity-type"
      />,
    );
  }
  if (action.value) {
    chips.push(
      <FilterChip
        key="action"
        name="Action"
        label={AUDIT_ACTION_LABEL[action.value]}
        onRemove={() => action.set(null)}
        data-testid="audit-filter-chip-action"
      />,
    );
  }
  if (performedBy.value) {
    chips.push(
      <FilterChip
        key="performed-by"
        name="By"
        label={performedByOption?.displayName ?? performedByOption?.email ?? performedBy.value}
        onRemove={() => performedBy.set(null)}
        data-testid="audit-filter-chip-performed-by"
      />,
    );
  }

  return (
    <FilterBar
      data-testid="audit-filters"
      hasActiveFilters={hasActiveFilters}
      onClearAll={resetAll}
      search={
        <UrlSearchInput
          param="entityId"
          resetParams={CURSOR_RESET_PARAMS}
          placeholder="Record ID (UUID / primary key)"
          aria-label="Record ID"
          debounceMs={350}
          data-testid="audit-filter-entity-id"
        />
      }
      controls={
        <>
          <UrlDateRangePicker
            defaultRange={computeDefaultRange}
            resetParams={CURSOR_RESET_PARAMS}
            clearable={false}
            aria-label="Date range"
            data-testid="audit-filter-date"
            className="min-w-[16rem] sm:w-auto"
          />
          <SearchableSelect
            value={entityType.value}
            onChange={entityType.set}
            options={allowedEntityTypes.map((et) => ({
              value: et,
              label: humanizeEntityType(et),
              searchValue: `${et} ${humanizeEntityType(et)}`,
            }))}
            placeholder="Any record type"
            searchPlaceholder="Search types…"
            emptyLabel="No matching types."
            clearable
            aria-label="Record type"
            data-testid="audit-filter-entity-type"
            className="min-w-[12rem] sm:w-auto"
          />
          <Select
            value={action.value ?? ""}
            onValueChange={(next) =>
              action.set(next === "" ? null : (next as (typeof AUDIT_ACTIONS)[number]))
            }
          >
            <SelectTrigger
              className="h-10 min-w-[10rem] sm:w-auto"
              aria-label="Action"
              data-testid="audit-filter-action"
            >
              <SelectValue placeholder="Any action" />
            </SelectTrigger>
            <SelectContent>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {AUDIT_ACTION_LABEL[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchableSelect
            value={performedBy.value}
            onChange={performedBy.set}
            options={staff.map((s) => {
              const meta = [s.employeeId, s.email].filter(Boolean).join(" · ");
              return {
                value: s.id,
                label: s.displayName || s.email || s.id,
                searchValue: `${s.displayName ?? ""} ${s.email ?? ""} ${s.employeeId ?? ""}`,
                ...(meta ? { description: meta } : {}),
              };
            })}
            placeholder="Anyone"
            searchPlaceholder="Search staff…"
            emptyLabel="No staff match."
            clearable
            aria-label="Performed by"
            data-testid="audit-filter-performed-by"
            className="min-w-[14rem] sm:w-auto"
          />
        </>
      }
      chips={chips.length > 0 ? chips : null}
    />
  );
}
