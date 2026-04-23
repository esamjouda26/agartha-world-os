"use client";

import * as React from "react";
import { FilterX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * FilterBar — horizontal strip hosting filter controls + active-chip row
 * + clear-all action.
 *
 * The direct replacement for the hand-rolled filter-layout repeated across
 * every admin/management list page (Audit, Goods Movements, Leave Requests,
 * Attendance Ledger, IAM Staff, …). Every caller renders controls into the
 * `<FilterBar.Controls>` slot; when any filter is committed, they map the
 * committed set into `<FilterChip>` children inside `<FilterBar.Chips>`.
 *
 * Separation of concerns:
 *   - `<FilterBar>`   owns chrome + responsive collapse + clear-all.
 *   - Controls slot   hosts Select / SearchInput / DateRangePicker / etc.
 *   - Chips slot      renders `<FilterChip>` for each committed filter.
 *   - More slot       reveals a `<FilterGroupPanel>` (shared organism).
 *
 * Callers wire their own URL-param → committed-filters mapping (nuqs).
 * The bar is controlled: it exposes `hasActiveFilters` + `onClearAll`,
 * caller owns both.
 */

type FilterBarProps = Readonly<{
  /** Primary search input (grows to fill available space). */
  search?: React.ReactNode;
  /** Horizontal controls row (left-aligned, fixed width). */
  controls?: React.ReactNode;
  /** Chip row shown below the controls when any filter is committed. */
  chips?: React.ReactNode;
  /** Right-aligned cluster — typically a `<Button>` that toggles `<FilterGroupPanel>`. */
  moreAction?: React.ReactNode;
  /** Expanded panel slot rendered below the bar. Caller wires open/close state. */
  moreContent?: React.ReactNode;
  /** Any filter is committed — controls the "Clear all" visibility. */
  hasActiveFilters?: boolean;
  onClearAll?: () => void;
  clearLabel?: string;
  density?: "default" | "compact";
  className?: string;
  "data-testid"?: string;
}>;

export function FilterBar({
  search,
  controls,
  chips,
  moreAction,
  moreContent,
  hasActiveFilters = false,
  onClearAll,
  clearLabel = "Clear all",
  density = "default",
  className,
  "data-testid": testId,
}: FilterBarProps) {
  return (
    <div
      role="search"
      data-slot="filter-bar"
      data-density={density}
      data-testid={testId}
      className={cn("flex flex-col gap-2", density === "compact" ? "gap-1.5" : null, className)}
    >
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
          {search ? (
            <div data-slot="filter-bar-search" className="min-w-[16rem] flex-1">
              {search}
            </div>
          ) : null}
          {controls ? (
            <div data-slot="filter-bar-controls" className="flex flex-wrap items-center gap-2">
              {controls}
            </div>
          ) : null}
        </div>
        <div data-slot="filter-bar-actions" className="flex shrink-0 flex-wrap items-center gap-2">
          {moreAction}
          {hasActiveFilters && onClearAll ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              data-testid={testId ? `${testId}-clear-all` : undefined}
            >
              <FilterX aria-hidden className="size-3.5" />
              {clearLabel}
            </Button>
          ) : null}
        </div>
      </div>
      {chips ? (
        <div data-slot="filter-bar-chips" className="flex flex-wrap items-center gap-1.5">
          {chips}
        </div>
      ) : null}
      {moreContent ? <div data-slot="filter-bar-more">{moreContent}</div> : null}
    </div>
  );
}
