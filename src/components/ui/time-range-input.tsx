"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * TimeRangeInput — paired `HH:MM` start/end time inputs.
 *
 * Used for shift types (`shift_types.start_time` / `end_time`) and any
 * other facility wall-clock window (booking slot, disposal window,
 * maintenance hold). Emits strings in `HH:MM` 24-hour format. The
 * primitive does NOT validate that `end > start` — callers enforce that
 * via their Zod schema (e.g. shift types allow overnight windows where
 * `end < start`, so a generic constraint would be wrong).
 *
 * Controlled: caller owns both halves of the value.
 */

export type TimeRangeValue = Readonly<{ start: string; end: string }>;

export type TimeRangeInputProps = Readonly<{
  value: TimeRangeValue;
  onChange: (value: TimeRangeValue) => void;
  /** Optional name prefix so browsers can autofill each half. */
  name?: string;
  /** Step in seconds for native time input increments. Default: `60` (1 min). */
  step?: number;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  startLabel?: string;
  endLabel?: string;
  startId?: string;
  endId?: string;
  className?: string;
  "data-testid"?: string;
}>;

export function TimeRangeInput({
  value,
  onChange,
  name,
  step = 60,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  startLabel = "Start time",
  endLabel = "End time",
  startId,
  endId,
  className,
  "data-testid": testId,
}: TimeRangeInputProps) {
  return (
    <div
      data-slot="time-range-input"
      data-testid={testId}
      role="group"
      aria-label={ariaLabel}
      className={cn("flex items-center gap-2", className)}
    >
      <Input
        type="time"
        step={step}
        value={value.start}
        onChange={(event) => onChange({ ...value, start: event.target.value })}
        aria-label={startLabel}
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        {...(startId !== undefined ? { id: startId } : {})}
        {...(name !== undefined ? { name: `${name}_start` } : {})}
        data-testid={testId ? `${testId}-start` : undefined}
        className="font-mono tabular-nums"
      />
      <span aria-hidden className="text-foreground-subtle text-sm">
        –
      </span>
      <Input
        type="time"
        step={step}
        value={value.end}
        onChange={(event) => onChange({ ...value, end: event.target.value })}
        aria-label={endLabel}
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        {...(endId !== undefined ? { id: endId } : {})}
        {...(name !== undefined ? { name: `${name}_end` } : {})}
        data-testid={testId ? `${testId}-end` : undefined}
        className="font-mono tabular-nums"
      />
    </div>
  );
}
