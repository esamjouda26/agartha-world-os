"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * WizardProgress — slim, glanceable progress strip.
 *
 * Replaces the 6-circle Stepper for the public booking wizard. On mobile
 * a 5-circle stepper truncates labels and feels noisy; this strip puts
 * the current step name in plain text and uses a thin fill bar to
 * communicate completion. Clickable past steps are exposed as a small
 * "Steps" jump menu rendered alongside the bar.
 *
 * Pure presentational. Caller owns navigation.
 */

export type WizardProgressStep = Readonly<{
  id: string;
  label: string;
  status: "complete" | "current" | "upcoming";
}>;

export type WizardProgressProps = Readonly<{
  steps: readonly WizardProgressStep[];
  /** Index of the current step (0-based). */
  currentIndex: number;
  /** Optional click handler when a completed step's marker is selected. */
  onStepClick?: (id: string, index: number) => void;
  className?: string;
  "data-testid"?: string;
}>;

export function WizardProgress({
  steps,
  currentIndex,
  onStepClick,
  className,
  "data-testid": testId,
}: WizardProgressProps) {
  const total = steps.length;
  const current = steps[currentIndex];
  const filled = ((currentIndex + 1) / total) * 100;
  return (
    <div
      data-testid={testId ?? "wizard-progress"}
      data-current-step={current?.id}
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-foreground text-sm font-semibold tracking-tight">
          {current ? current.label : ""}
        </p>
        <p className="text-foreground-muted text-xs tabular-nums" aria-live="polite">
          Step {currentIndex + 1} of {total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={currentIndex + 1}
        aria-label={current ? `${current.label}, step ${currentIndex + 1} of ${total}` : "Progress"}
        className="bg-border-subtle h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-brand-primary h-full rounded-full transition-[width] duration-[var(--duration-layout)]"
          style={{ width: `${filled}%` }}
        />
      </div>
      {/* Tiny accessible step markers — render as semantic list of buttons
          so keyboard users can jump back to completed steps. Hidden on
          screen readers' "current" entry to avoid double-announcement
          alongside the title above. */}
      {onStepClick ? (
        <ul className="flex items-center gap-1.5 pt-0.5">
          {steps.map((step, idx) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onStepClick(step.id, idx)}
                disabled={step.status === "upcoming"}
                aria-label={`${step.label} (${step.status})`}
                aria-current={step.status === "current" ? "step" : undefined}
                data-testid={`wizard-progress-marker-${step.id}`}
                className={cn(
                  "h-1 w-5 rounded-full transition-[background-color,opacity] outline-none",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
                  step.status === "complete"
                    ? "bg-brand-primary cursor-pointer hover:opacity-80"
                    : step.status === "current"
                      ? "bg-brand-primary"
                      : "bg-border-subtle cursor-not-allowed",
                )}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
