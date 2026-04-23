import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FieldGroup — semantic `<fieldset>` + `<legend>` wrapper for related
 * inputs that share a single programmatic label (radio groups, checkbox
 * groups, multi-field inputs like "Address" or "Shift window").
 *
 * Unlike `<FormSection>` which is visual, `<FieldGroup>` is a11y-driven
 * (WCAG 2.2 §1.3.1 + §3.3.2 / CLAUDE.md §19). Screen readers announce
 * the legend when any descendant control receives focus.
 */

export type FieldGroupProps = Readonly<{
  legend: React.ReactNode;
  description?: React.ReactNode;
  /** Visually hide the legend (still announced to AT). */
  srOnlyLegend?: boolean;
  /** Error message — rendered with `role="alert"` for assistive tech. */
  error?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
  children: React.ReactNode;
}>;

export function FieldGroup({
  legend,
  description,
  srOnlyLegend = false,
  error,
  className,
  "data-testid": testId,
  children,
}: FieldGroupProps) {
  return (
    <fieldset
      data-slot="field-group"
      data-testid={testId}
      aria-invalid={error ? true : undefined}
      className={cn("flex flex-col gap-2", className)}
    >
      <legend
        className={cn(
          "text-foreground text-sm leading-none font-medium",
          srOnlyLegend ? "sr-only" : "mb-1",
        )}
      >
        {legend}
      </legend>
      {description ? <p className="text-foreground-muted -mt-1 text-xs">{description}</p> : null}
      <div className="flex flex-col gap-2">{children}</div>
      {error ? (
        <p role="alert" className="text-status-danger-foreground text-xs">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
