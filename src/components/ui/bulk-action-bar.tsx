"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * BulkActionBar — sticky strip that appears when rows are selected.
 *
 * Shows the selection count, a caller-supplied cluster of action buttons,
 * and a "Clear" control that deselects everything. Used above or below
 * `<DataTable>` / list views when bulk operations are available
 * (PO mark-as-sent, bulk add materials, etc.).
 *
 * The `<DataTable>` primitive already renders its own bulk action bar
 * above the table when `bulkActionBar` prop is provided. Use THIS
 * primitive only when you need a bar outside the table, or when you
 * want a sticky-bottom presentation instead of the table-embedded one.
 */

export type BulkActionBarProps = Readonly<{
  /** Currently selected row count. Bar renders only when > 0. */
  selectedCount: number;
  /** Action buttons — typically `<Button size="sm">` clusters. */
  actions: React.ReactNode;
  /** Clear-selection handler; rendered as a trailing ghost button. */
  onClear: () => void;
  /** Override the "N selected" label (e.g. "3 punches selected"). */
  label?: (count: number) => React.ReactNode;
  /** Position — sticky bottom or inline. */
  position?: "inline" | "sticky-bottom";
  className?: string;
  "data-testid"?: string;
}>;

export function BulkActionBar({
  selectedCount,
  actions,
  onClear,
  label,
  position = "inline",
  className,
  "data-testid": testId,
}: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div
      role="region"
      aria-label={`${selectedCount} selected`}
      data-slot="bulk-action-bar"
      data-position={position}
      data-testid={testId}
      className={cn(
        "border-brand-primary/40 bg-brand-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2",
        position === "sticky-bottom" ? "sticky bottom-4 z-20 shadow-lg backdrop-blur-md" : null,
        className,
      )}
    >
      <span className="text-foreground text-sm font-medium">
        {label ? label(selectedCount) : `${selectedCount} selected`}
      </span>
      <div className="flex items-center gap-2">
        {actions}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          data-testid={testId ? `${testId}-clear` : undefined}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
