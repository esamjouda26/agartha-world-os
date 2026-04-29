"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * GuestCountStepper — accessible numeric stepper for adult/child counts.
 *
 * Spec: frontend_spec.md:3418 ("Select tier + guest count: adult_count >= 1,
 * child_count >= 0").
 *
 * Mobile-first: ±buttons are 44×44 to satisfy CLAUDE.md §5 touch-target
 * rule. The count itself is a `<span>` with `aria-live="polite"` so screen
 * readers announce changes without us yanking focus. We use real buttons
 * (not invisible <input type="number">) because virtual keyboards on
 * mobile pop on every change which feels jarring.
 */

export type GuestCountStepperProps = Readonly<{
  label: string;
  description?: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  /** Translated aria-label for the minus button. Required — no default. */
  decreaseLabel: string;
  /** Translated aria-label for the plus button. Required — no default. */
  increaseLabel: string;
  className?: string;
  "data-testid"?: string;
}>;

export function GuestCountStepper({
  label,
  description,
  value,
  onChange,
  min,
  max,
  decreaseLabel,
  increaseLabel,
  className,
  "data-testid": testId,
}: GuestCountStepperProps) {
  const id = React.useId();
  const labelId = `${id}-label`;
  const descId = description ? `${id}-desc` : undefined;
  const decrement = (): void => {
    if (value > min) onChange(value - 1);
  };
  const increment = (): void => {
    if (value < max) onChange(value + 1);
  };
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <div
      data-slot="guest-count-stepper"
      data-testid={testId}
      className={cn("flex items-center justify-between gap-4", className)}
    >
      <div className="flex flex-col gap-0.5">
        <span id={labelId} className="text-foreground text-sm font-medium">
          {label}
        </span>
        {description ? (
          <span id={descId} className="text-foreground-muted text-xs">
            {description}
          </span>
        ) : null}
      </div>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={descId}
        className="flex items-center gap-2"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={decrement}
          disabled={atMin}
          aria-label={decreaseLabel}
          data-testid={testId ? `${testId}-decrement` : undefined}
          className="size-11"
        >
          <Minus aria-hidden className="size-4" />
        </Button>
        <span
          aria-live="polite"
          aria-atomic="true"
          className="text-foreground inline-flex w-10 justify-center text-base font-semibold tabular-nums"
          data-testid={testId ? `${testId}-value` : undefined}
        >
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={increment}
          disabled={atMax}
          aria-label={increaseLabel}
          data-testid={testId ? `${testId}-increment` : undefined}
          className="size-11"
        >
          <Plus aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  );
}
