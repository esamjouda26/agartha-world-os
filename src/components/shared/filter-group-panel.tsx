"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

/**
 * FilterGroupPanel — collapsible panel with many filters + apply/reset.
 *
 * The "More filters" expansion of `<FilterBar>`. Hosts a dense grid of
 * `<FilterItem>` children (label + control + per-field reset). Users
 * commit via Apply; caller decides whether staged filter state lives in
 * local state (apply-on-Apply) or live state (apply-as-you-go).
 *
 * Typical layout: 2–3 column grid of FilterItems on desktop; stacks on
 * mobile. For the horizontal inline bar, use `<FilterBar>` alone.
 */

export type FilterGroupPanelProps = Readonly<{
  /** Controlled open state (often `useState` in the parent list page). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** `<FilterItem>` children rendered in a responsive grid. */
  children: React.ReactNode;
  /** Fires when Apply is pressed. */
  onApply: () => void;
  /** Fires when Reset is pressed. */
  onReset: () => void;
  applyLabel?: string;
  resetLabel?: string;
  /** Disable Apply (e.g. when nothing has changed). */
  applyDisabled?: boolean;
  /** Column count for the FilterItem grid. */
  cols?: 2 | 3;
  className?: string;
  "data-testid"?: string;
}>;

const COLS: Record<NonNullable<FilterGroupPanelProps["cols"]>, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
};

export function FilterGroupPanel({
  open,
  onOpenChange,
  title = "More filters",
  description,
  children,
  onApply,
  onReset,
  applyLabel = "Apply",
  resetLabel = "Reset all",
  applyDisabled = false,
  cols = 3,
  className,
  "data-testid": testId,
}: FilterGroupPanelProps) {
  return (
    <CollapsibleSection
      title={title}
      {...(description ? { description } : {})}
      open={open}
      onOpenChange={onOpenChange}
      {...(testId !== undefined ? { "data-testid": testId } : {})}
      className={cn("", className)}
    >
      <div className={cn("grid grid-cols-1 gap-4", COLS[cols])}>{children}</div>
      <div className="border-border-subtle mt-4 flex items-center justify-end gap-2 border-t pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          data-testid={testId ? `${testId}-reset` : undefined}
        >
          {resetLabel}
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={applyDisabled}
          onClick={onApply}
          data-testid={testId ? `${testId}-apply` : undefined}
        >
          {applyLabel}
        </Button>
      </div>
    </CollapsibleSection>
  );
}
