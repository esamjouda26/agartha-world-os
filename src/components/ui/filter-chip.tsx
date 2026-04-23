import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * FilterChip — active-filter pill with a remove-X affordance.
 *
 * Used inside `<FilterBar>` to visualize each committed filter (status =
 * pending, location = HQ, date = last 7 days). Clicking × fires
 * `onRemove`; caller decides whether to delete the param, reset to
 * default, or clear a multi-select entry.
 *
 * Not interactive beyond remove — if you want a clickable filter
 * shortcut, use `<Button size="sm" variant="outline">` instead.
 */

export type FilterChipProps = Readonly<{
  label: React.ReactNode;
  /** Optional prefix showing the filter name (e.g. "Status:"). */
  name?: React.ReactNode;
  /** Fires when × is pressed. Omit to render a static chip. */
  onRemove?: () => void;
  /** Disable the × without removing it from the DOM. */
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}>;

export function FilterChip({
  label,
  name,
  onRemove,
  disabled = false,
  className,
  "data-testid": testId,
}: FilterChipProps) {
  return (
    <span
      data-slot="filter-chip"
      data-testid={testId}
      className={cn(
        "border-border-subtle bg-surface/60 text-foreground",
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        "transition-colors duration-[var(--duration-micro)]",
        className,
      )}
    >
      {name ? <span className="text-foreground-subtle shrink-0">{name}</span> : null}
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove filter"
          data-testid={testId ? `${testId}-remove` : undefined}
          className={cn(
            "text-foreground-subtle hover:text-foreground -mr-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full",
            "hover:bg-border-subtle",
            "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-1",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <X aria-hidden className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
