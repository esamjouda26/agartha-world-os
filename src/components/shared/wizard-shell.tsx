"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Stepper, type StepperStep } from "@/components/ui/stepper";

/**
 * WizardShell — multi-step flow chrome.
 *
 * Renders a step indicator at the top and Back / Next / Submit controls
 * at the bottom, hosting the per-step panel in between. Used for new-
 * hire onboarding (`frontend_spec.md:1490`), multi-step booking
 * (`frontend_spec.md:3415`), device enrollment, PO receiving wizard.
 *
 * Pattern C:
 *   - Caller owns `stepIndex` and validates transitions (e.g. prevents
 *     Next until the current panel's schema passes).
 *   - `onNext` / `onBack` / `onSubmit` are async so the shell can disable
 *     controls during server-action round-trips.
 *   - The shell does NOT own form state. Each step's inputs live in the
 *     caller's `react-hook-form` context.
 */

export type WizardStep = StepperStep & Readonly<{ panel: React.ReactNode }>;

export type WizardShellProps = Readonly<{
  steps: readonly WizardStep[];
  /** 0-based index of the active step. */
  stepIndex: number;
  onBack: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
  /** Disables Next (or Submit on final step) — typically tied to form validity. */
  canAdvance?: boolean;
  /** Hides Back on the first step regardless. Defaults to `true`. */
  hideBackOnFirst?: boolean;
  /** Override labels. */
  backLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  pending?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
  "data-testid"?: string;
}>;

export function WizardShell({
  steps,
  stepIndex,
  onBack,
  onNext,
  onSubmit,
  canAdvance = true,
  hideBackOnFirst = true,
  backLabel = "Back",
  nextLabel = "Next",
  submitLabel = "Submit",
  pending = false,
  orientation = "horizontal",
  className,
  "data-testid": testId,
}: WizardShellProps) {
  const activeStep = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const isFirst = stepIndex === 0;

  return (
    <div
      data-slot="wizard-shell"
      data-testid={testId}
      className={cn("flex flex-col gap-6", className)}
    >
      <Stepper steps={steps} orientation={orientation} />
      <div
        data-slot="wizard-panel"
        className="border-border-subtle bg-card rounded-xl border p-4 shadow-xs md:p-6"
      >
        {activeStep?.panel}
      </div>
      <footer
        data-slot="wizard-footer"
        className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          {!isFirst || !hideBackOnFirst ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending || isFirst}
              onClick={() => void onBack()}
              data-testid={testId ? `${testId}-back` : undefined}
            >
              {backLabel}
            </Button>
          ) : (
            <span />
          )}
        </div>
        <Button
          type="button"
          variant="default"
          disabled={!canAdvance || pending}
          onClick={() => void (isLast ? onSubmit() : onNext())}
          data-testid={testId ? (isLast ? `${testId}-submit` : `${testId}-next`) : undefined}
        >
          {isLast ? submitLabel : nextLabel}
        </Button>
      </footer>
    </div>
  );
}
