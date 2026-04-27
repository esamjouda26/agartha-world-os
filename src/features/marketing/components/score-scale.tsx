"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * ScoreScale — accessible 0-10 horizontal button group.
 *
 * Used by the public /survey for both overall score and NPS. Buttons
 * over a slider because committing a specific number with one tap is
 * less ambiguous and meets WCAG 2.2 AA touch-target expectations.
 *
 * `tone="nps"` activates promoter/passive/detractor colouring on the
 * SELECTED tile so the meaning of an NPS score becomes glanceable
 * post-tap (0-6 muted-warning, 7-8 neutral, 9-10 brand). Other tones
 * use a single brand colour for the selected tile.
 *
 * Wraps to two rows on `<sm` (0-5 / 6-10) so each tile is at least
 * 44px on the smallest target, satisfying CLAUDE.md §5 touch-target
 * rule.
 */

export type ScoreScaleTone = "default" | "nps";

export type ScoreScaleProps = Readonly<{
  value: number | null;
  onChange: (next: number) => void;
  /** Optional accessible label — falls back to data-testid when omitted. */
  "aria-label"?: string;
  /** Labels for the extremes (e.g. "Poor" / "Excellent" or "Not at all" / "Definitely"). */
  lowLabel: string;
  highLabel: string;
  tone?: ScoreScaleTone;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}>;

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function npsTone(score: number): "detractor" | "passive" | "promoter" {
  if (score <= 6) return "detractor";
  if (score <= 8) return "passive";
  return "promoter";
}

const NPS_SELECTED_CLASS: Record<ReturnType<typeof npsTone>, string> = {
  detractor: "bg-status-warning-soft border-status-warning-border text-status-warning-foreground",
  passive: "bg-status-info-soft border-status-info-border text-status-info-foreground",
  promoter:
    "bg-brand-primary/15 dark:bg-brand-primary/25 border-brand-primary text-foreground shadow-[0_0_0_1px_var(--brand-primary)]",
};

export function ScoreScale({
  value,
  onChange,
  "aria-label": ariaLabel,
  lowLabel,
  highLabel,
  tone = "default",
  disabled = false,
  className,
  "data-testid": testId,
}: ScoreScaleProps) {
  // Roving tabindex pattern (WAI-ARIA APG radiogroup):
  //   - Only one button is in the tab order at a time (the selected one,
  //     or 0 if none selected)
  //   - Arrow keys move focus + select; Home/End jump to first/last
  // This makes the 11-button scale usable with a screen reader and
  // keyboard, satisfying WCAG 2.1.1 (keyboard) + 4.1.2 (name/role/value)
  const focusedIndex = value ?? 0;
  const buttonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const moveFocus = (next: number): void => {
    if (disabled) return;
    const clamped = Math.max(0, Math.min(SCORES.length - 1, next));
    const target = SCORES[clamped];
    if (target === undefined) return;
    onChange(target);
    // Defer focus to after React commits the new selected state.
    requestAnimationFrame(() => {
      buttonRefs.current[clamped]?.focus();
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveFocus(focusedIndex + 1);
        return;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveFocus(focusedIndex - 1);
        return;
      case "Home":
        e.preventDefault();
        moveFocus(0);
        return;
      case "End":
        e.preventDefault();
        moveFocus(SCORES.length - 1);
        return;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? "Score"}
      data-testid={testId ?? "score-scale"}
      className={cn("flex flex-col gap-2", className)}
      onKeyDown={handleKey}
    >
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
        {SCORES.map((n, idx) => {
          const selected = value === n;
          const selectedNpsClass =
            tone === "nps" && selected ? NPS_SELECTED_CLASS[npsTone(n)] : null;
          // Roving tabindex: the selected (or first when none-selected) tile is in tab order.
          const isTabStop = value === null ? n === 0 : selected;
          return (
            <button
              key={n}
              ref={(el) => {
                buttonRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={isTabStop ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(n)}
              data-testid={testId ? `${testId}-${n}` : undefined}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-md border text-sm font-semibold tabular-nums",
                "transition-[background-color,border-color,box-shadow] outline-none",
                "duration-[var(--duration-small)]",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? (selectedNpsClass ??
                      "border-brand-primary bg-brand-primary/10 dark:bg-brand-primary/20 text-foreground shadow-[0_0_0_1px_var(--brand-primary)]")
                  : "border-border-subtle bg-card hover:border-border hover:bg-surface text-foreground-muted",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="text-foreground-muted flex items-center justify-between text-xs">
        <span>0 · {lowLabel}</span>
        <span>{highLabel} · 10</span>
      </div>
    </div>
  );
}
