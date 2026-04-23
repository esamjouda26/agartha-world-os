import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FormRow — responsive multi-column form layout.
 *
 * Stacks vertically on mobile, collapses to `cols` equal-width tracks at
 * `md+`. Replaces the hand-rolled `grid grid-cols-2 gap-4` pattern that
 * recurs ~20× in `frontend_spec.md`. One canonical row so changing form
 * density across the OS is a single-file edit.
 *
 * Use for grouping 2–4 related fields that share a line on desktop
 * (Name + Email, Start + End time, Location + Category). For a single
 * field or a full-width form, don't wrap — render the field directly.
 */

export type FormRowProps = Readonly<{
  /** Number of equal-width tracks on `md+`. Defaults to `2`. */
  cols?: 2 | 3 | 4;
  /** Gap token between tracks. Defaults to `md`. */
  gap?: "sm" | "md" | "lg";
  className?: string;
  "data-testid"?: string;
  children: React.ReactNode;
}>;

const COLS: Record<NonNullable<FormRowProps["cols"]>, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

const GAP: Record<NonNullable<FormRowProps["gap"]>, string> = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

export function FormRow({
  cols = 2,
  gap = "md",
  className,
  "data-testid": testId,
  children,
}: FormRowProps) {
  return (
    <div
      data-slot="form-row"
      data-cols={cols}
      data-testid={testId}
      className={cn("grid grid-cols-1", COLS[cols], GAP[gap], className)}
    >
      {children}
    </div>
  );
}
