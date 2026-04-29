"use client";

import { cn } from "@/lib/utils";

/**
 * WizardProgress — segmented progress bar with step navigation.
 *
 * Replaces the previous dual-indicator (progress bar + dot markers) with
 * a single segmented bar. Each segment represents one step; completed
 * segments are clickable for back-navigation, current is highlighted,
 * upcoming are muted. The step label + "Step N of M" text provide
 * context.
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
      {/* Segmented progress — each step is one segment. Completed segments
          are clickable for back-navigation; the current segment is branded;
          upcoming segments are muted. Single visual indicator replaces the
          previous bar + dot-marker dual system. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={currentIndex + 1}
        aria-label={current ? `${current.label}, step ${currentIndex + 1} of ${total}` : "Progress"}
        className="flex w-full items-center gap-1"
      >
        {steps.map((step, idx) => {
          const isComplete = step.status === "complete";
          const isCurrent = step.status === "current";
          const isClickable = isComplete && Boolean(onStepClick);

          const segment = (
            <div
              className={cn(
                "h-1.5 flex-1 rounded-full transition-[background-color] duration-[var(--duration-layout)]",
                isComplete
                  ? "bg-brand-primary"
                  : isCurrent
                    ? "bg-brand-primary"
                    : "bg-border-subtle",
              )}
            />
          );

          if (isClickable) {
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick?.(step.id, idx)}
                aria-label={`Go back to ${step.label}`}
                data-testid={`wizard-progress-segment-${step.id}`}
                className="focus-visible:ring-ring flex-1 cursor-pointer rounded-full outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                {segment}
              </button>
            );
          }

          return (
            <div
              key={step.id}
              aria-label={`${step.label} (${step.status})`}
              aria-current={isCurrent ? "step" : undefined}
              data-testid={`wizard-progress-segment-${step.id}`}
              className="flex-1"
            >
              {segment}
            </div>
          );
        })}
      </div>
    </div>
  );
}
