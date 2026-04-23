"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { DataTable, type DataTableProps } from "@/components/ui/data-table";
import { EmptyState, type EmptyStateProps } from "@/components/ui/empty-state";

/**
 * FilterableDataTable — the canonical list-page body ("Premium Frame").
 *
 * Replaces the hand-rolled "KPI row + search + filters + table +
 * pagination + empty-state" scaffold that every admin/management list
 * page rebuilds. A single unified card surface (`bg-card`, hairline
 * border, rounded-xl, soft shadow) wraps toolbar + table + pagination
 * so the list surface reads as one contiguous region rather than three
 * floating blocks.
 *
 * Composition:
 *   - `kpis`        — KPI row slot rendered OUTSIDE the frame (above).
 *   - `toolbar`     — any `ReactNode`. Typically a `<FilterBar>` or
 *                     `<TableToolbar>`. Rendered inside the frame with
 *                     `border-b` separator + consistent `px-4 py-3`
 *                     padding so the toolbar surface visually belongs
 *                     to the same card as the table body.
 *   - `table`       — `<DataTable>` props. Forwarded verbatim. We pass
 *                     `frame="none"` and `toolbar="none"` so DataTable
 *                     doesn't paint its own competing chrome.
 *   - `pagination`  — any `ReactNode`. Caller picks the right primitive:
 *                     `<CursorPagination>` for self-managed cursor
 *                     pagination, `<PaginationBar>` for caller-controlled
 *                     offset/cursor, or any custom footer.
 *   - `emptyState`  — overrides the default filtered-out empty state.
 *
 * Pattern C: this is a client organism. The RSC parent fetches data and
 * passes it in. Never calls Supabase directly.
 */

export type FilterableDataTableProps<TData> = Readonly<{
  /** Top slot — typically `<KpiCardRow>`. Rendered outside the frame. */
  kpis?: React.ReactNode;
  /** Any ReactNode — usually `<FilterBar>` or `<TableToolbar>`. */
  toolbar?: React.ReactNode;
  /** `<DataTable>` props. `frame` + `toolbar` are force-overridden. */
  table: Omit<DataTableProps<TData>, "frame" | "toolbar">;
  /** Footer ReactNode — usually `<CursorPagination>` or `<PaginationBar>`. */
  pagination?: React.ReactNode;
  /** Override the default empty-state when `table.data` is empty. */
  emptyState?: Omit<EmptyStateProps, "className"> | React.ReactNode;
  /** True when filters have been applied — swaps default empty to filtered-out. */
  hasActiveFilters?: boolean;
  /** Wrapper class for the whole organism. */
  className?: string;
  /** Wrapper class on the framed card itself (overrides border radius etc). */
  frameClassName?: string;
  "data-testid"?: string;
}>;

function isEmptyStateProps(
  value: FilterableDataTableProps<unknown>["emptyState"],
): value is EmptyStateProps {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !React.isValidElement(value) &&
    "title" in (value as object)
  );
}

export function FilterableDataTable<TData>({
  kpis,
  toolbar,
  table,
  pagination,
  emptyState,
  hasActiveFilters = false,
  className,
  frameClassName,
  "data-testid": testId,
}: FilterableDataTableProps<TData>) {
  // Empty states inside the Premium Frame use `frame="none"` so the
  // EmptyState's own card chrome doesn't render a second card-in-card
  // layer over the FilterableDataTable's outer surface.
  const resolvedEmpty = React.useMemo<React.ReactNode>(() => {
    if (React.isValidElement(emptyState)) return emptyState;
    if (isEmptyStateProps(emptyState)) {
      return <EmptyState frame="none" {...emptyState} />;
    }
    return (
      <EmptyState
        frame="none"
        variant={hasActiveFilters ? "filtered-out" : "first-use"}
        title={hasActiveFilters ? "No matching results" : "Nothing to display"}
        description={
          hasActiveFilters
            ? "Try clearing filters or adjusting your search."
            : "Records will appear here once created."
        }
      />
    );
  }, [emptyState, hasActiveFilters]);

  return (
    <section
      data-slot="filterable-data-table"
      data-testid={testId}
      className={cn("flex flex-col gap-4", className)}
    >
      {kpis ? <div data-slot="filterable-data-table-kpis">{kpis}</div> : null}
      <div
        data-slot="filterable-data-table-frame"
        className={cn(
          "border-border-subtle bg-card flex flex-col overflow-hidden rounded-xl border shadow-xs",
          frameClassName,
        )}
      >
        {toolbar ? (
          <div
            data-slot="filterable-data-table-toolbar"
            className="border-border-subtle border-b px-4 py-3"
          >
            {toolbar}
          </div>
        ) : null}
        <div data-slot="filterable-data-table-body">
          <DataTable<TData> {...table} frame="none" toolbar="none" empty={resolvedEmpty} />
        </div>
        {pagination ? (
          <div
            data-slot="filterable-data-table-pagination"
            className="border-border-subtle bg-surface/50 border-t px-4 py-3"
          >
            {pagination}
          </div>
        ) : null}
      </div>
    </section>
  );
}
