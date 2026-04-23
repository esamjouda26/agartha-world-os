import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Stepper — numbered step indicator for multi-step flows.
 *
 * Uses `<ol>/<li>` so assistive tech announces the sequence. Each step
 * exposes one of four states via a single `status` field:
 *   - `complete`  — step finished, renders ✓ mark.
 *   - `current`   — active step, gold fill + aria-current.
 *   - `upcoming`  — hasn't happened yet, muted.
 *   - `error`     — validation or failure on this step.
 *
 * Not interactive by default — callers opt in via `onStepClick` when a
 * step should be jumpable (e.g. reviewing past steps in a booking
 * wizard). For the full wizard shell with back/next buttons, use
 * `<WizardShell>` (shared organism).
 */

export type StepperStatus = "complete" | "current" | "upcoming" | "error";

export type StepperStep = Readonly<{
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  status: StepperStatus;
  /** Custom indicator — defaults to the step index (or ✓ when complete). */
  indicator?: React.ReactNode;
  "data-testid"?: string;
}>;

export type StepperProps = Readonly<{
  steps: readonly StepperStep[];
  orientation?: "horizontal" | "vertical";
  /** Clickable steps — caller validates transition (prevent skipping ahead). */
  onStepClick?: (step: StepperStep, index: number) => void;
  className?: string;
  "data-testid"?: string;
}>;

const STATUS_STYLES: Record<StepperStatus, { bubble: string; text: string; connector: string }> = {
  complete: {
    bubble: "bg-brand-primary border-brand-primary text-primary-foreground",
    text: "text-foreground",
    connector: "bg-brand-primary",
  },
  current: {
    bubble: "bg-background border-brand-primary text-brand-primary ring-2 ring-brand-primary/25",
    text: "text-foreground font-semibold",
    connector: "bg-border",
  },
  upcoming: {
    bubble: "bg-background border-border text-foreground-subtle",
    text: "text-foreground-muted",
    connector: "bg-border",
  },
  error: {
    bubble: "bg-status-danger-soft border-status-danger-border text-status-danger-foreground",
    text: "text-status-danger-foreground font-semibold",
    connector: "bg-border",
  },
};

export function Stepper({
  steps,
  orientation = "horizontal",
  onStepClick,
  className,
  "data-testid": testId,
}: StepperProps) {
  return (
    <ol
      data-slot="stepper"
      data-orientation={orientation}
      data-testid={testId}
      className={cn(
        "flex",
        orientation === "horizontal"
          ? "flex-row items-start justify-between gap-2"
          : "flex-col gap-3",
        className,
      )}
    >
      {steps.map((step, index) => {
        const styles = STATUS_STYLES[step.status];
        const isLast = index === steps.length - 1;
        const indicator =
          step.indicator ?? (step.status === "complete" ? <Check className="size-4" /> : index + 1);
        const clickable = Boolean(onStepClick) && step.status !== "upcoming";

        return (
          <li
            key={step.id}
            data-status={step.status}
            data-testid={step["data-testid"]}
            aria-current={step.status === "current" ? "step" : undefined}
            className={cn(
              "flex min-w-0 gap-3",
              orientation === "horizontal" ? "flex-1 flex-col items-start" : "flex-row items-start",
            )}
          >
            <div
              className={cn(
                "flex items-center",
                orientation === "horizontal" ? "w-full" : "flex-col",
                orientation === "vertical" ? "h-full" : null,
              )}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onStepClick?.(step, index) : undefined}
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums",
                  "transition-[background-color,border-color,color] duration-[var(--duration-micro)]",
                  clickable
                    ? "hover:border-brand-primary focus-visible:outline-ring cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
                    : "cursor-default",
                  styles.bubble,
                )}
              >
                {indicator}
              </button>
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    styles.connector,
                    orientation === "horizontal" ? "mx-2 h-0.5 flex-1" : "my-2 ml-4 w-0.5 flex-1",
                  )}
                />
              ) : null}
            </div>
            <div
              className={cn(
                "flex min-w-0 flex-col gap-0.5",
                orientation === "horizontal" ? "w-full" : null,
              )}
            >
              <span className={cn("text-sm leading-tight", styles.text)}>{step.label}</span>
              {step.description ? (
                <span className="text-foreground-muted text-xs leading-snug">
                  {step.description}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
