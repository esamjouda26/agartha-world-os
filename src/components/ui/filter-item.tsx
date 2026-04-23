import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * FilterItem — vertical label + control + optional reset affordance.
 *
 * Scoped to `<FilterGroupPanel>` (shared organism) — the "More filters"
 * collapsible. Inside a horizontal `<FilterBar>` this component is
 * redundant (that bar uses placeholder-as-label for density). Do not
 * use `<FilterItem>` for general form field layout — use `<FormRow>` +
 * RHF `<FormField>/<FormLabel>/<FormControl>` instead.
 *
 * The `onReset` affordance is visible only when `dirty = true` so the
 * per-filter reset link doesn't clutter the panel at rest.
 */

export type FilterItemProps = Readonly<{
  label: React.ReactNode;
  /** Optional helper text under the label. */
  description?: React.ReactNode;
  /** When true, renders the "Reset" inline action. */
  dirty?: boolean;
  onReset?: () => void;
  resetLabel?: string;
  /** Maps `<label htmlFor>` to the rendered control's `id`. */
  htmlFor?: string;
  className?: string;
  "data-testid"?: string;
  children: React.ReactNode;
}>;

export function FilterItem({
  label,
  description,
  dirty = false,
  onReset,
  resetLabel = "Reset",
  htmlFor,
  className,
  "data-testid": testId,
  children,
}: FilterItemProps) {
  return (
    <div
      data-slot="filter-item"
      data-dirty={dirty || undefined}
      data-testid={testId}
      className={cn("flex flex-col gap-1.5", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <Label {...(htmlFor !== undefined ? { htmlFor } : {})} className="text-xs">
          {label}
        </Label>
        {dirty && onReset ? (
          <button
            type="button"
            onClick={onReset}
            data-testid={testId ? `${testId}-reset` : undefined}
            className={cn(
              "text-brand-primary hover:text-brand-primary/80 text-[11px] font-medium",
              "transition-colors duration-[var(--duration-micro)]",
              "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
          >
            {resetLabel}
          </button>
        ) : null}
      </div>
      {description ? (
        <p className="text-foreground-muted -mt-1 text-[11px]">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
