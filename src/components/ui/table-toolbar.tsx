import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * TableToolbar — horizontal strip above a data table.
 *
 * Named-slot shell that hosts:
 *   - `search`    — `<SearchInput>` (debounced or URL-synced).
 *   - `filters`   — `<FilterBar>` or inline filter controls.
 *   - `actions`   — right-aligned cluster of action buttons.
 *   - `extras`    — `<ColumnVisibilityMenu>`, `<ExportMenu>`, density.
 *   - `tabs`      — optional status tab bar above the main row.
 *
 * This primitive does NOT know about `<DataTable>` — it's a layout
 * shell. `<DataTable>` embeds its own minimal toolbar for density +
 * column visibility; use `<TableToolbar>` for the outer strip that
 * hosts search, filters, and export actions.
 */

export type TableToolbarProps = Readonly<{
  /** Leading slot (usually `<SearchInput>`). */
  search?: React.ReactNode;
  /** Filter controls — typically `<FilterBar>` or a cluster of selects. */
  filters?: React.ReactNode;
  /** Right-aligned primary actions (New, Import, etc.). */
  actions?: React.ReactNode;
  /** Right-aligned secondary utilities (column toggle, export menu). */
  extras?: React.ReactNode;
  /** Optional tab bar rendered ABOVE the main row (status tabs). */
  tabs?: React.ReactNode;
  /** Optional heading row (KPI summary, metadata, selection state). */
  heading?: React.ReactNode;
  density?: "default" | "compact";
  className?: string;
  "data-testid"?: string;
}>;

export function TableToolbar({
  search,
  filters,
  actions,
  extras,
  tabs,
  heading,
  density = "default",
  className,
  "data-testid": testId,
}: TableToolbarProps) {
  const hasMainRow = Boolean(search || filters || actions || extras);

  return (
    <div
      data-slot="table-toolbar"
      data-density={density}
      data-testid={testId}
      className={cn("flex flex-col", density === "compact" ? "gap-2" : "gap-3", className)}
    >
      {heading ? <div data-slot="table-toolbar-heading">{heading}</div> : null}
      {tabs ? <div data-slot="table-toolbar-tabs">{tabs}</div> : null}
      {hasMainRow ? (
        <div
          data-slot="table-toolbar-main"
          className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3"
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:max-w-xl">
            {search ? <div className="min-w-0 flex-1">{search}</div> : null}
            {filters}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {extras}
            {actions}
          </div>
        </div>
      ) : null}
    </div>
  );
}
