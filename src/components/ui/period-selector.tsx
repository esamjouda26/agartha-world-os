"use client";

import * as React from "react";
import { GitCompareArrows } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";

/**
 * PeriodSelector — date-range picker + optional "compare vs prior period"
 * toggle. Primary use site is Reports and trend dashboards.
 *
 * Controlled: caller owns both the primary range AND the compare toggle.
 * The comparison range itself is derived by the caller (e.g. "last 7
 * days" comparing against the 7 days before that) — this primitive only
 * exposes the switch state.
 */

export type PeriodSelectorProps = Readonly<{
  value: DateRangeValue | null;
  onChange: (value: DateRangeValue | null) => void;
  compareEnabled: boolean;
  onCompareChange: (enabled: boolean) => void;
  compareLabel?: string;
  /** Pass-through props for the underlying `<DateRangePicker>`. */
  pickerProps?: Omit<DateRangePickerProps, "value" | "onChange">;
  className?: string;
  "data-testid"?: string;
}>;

export function PeriodSelector({
  value,
  onChange,
  compareEnabled,
  onCompareChange,
  compareLabel = "Compare to previous period",
  pickerProps,
  className,
  "data-testid": testId,
}: PeriodSelectorProps) {
  const compareId = React.useId();
  return (
    <div
      data-slot="period-selector"
      data-testid={testId}
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3", className)}
    >
      <DateRangePicker
        value={value}
        onChange={onChange}
        {...pickerProps}
        {...(testId ? { "data-testid": `${testId}-range` } : {})}
        className={cn("sm:w-auto", pickerProps?.className)}
      />
      <div className="flex items-center gap-2">
        <GitCompareArrows aria-hidden className="text-foreground-subtle size-4" />
        <Switch
          id={compareId}
          checked={compareEnabled}
          onCheckedChange={onCompareChange}
          data-testid={testId ? `${testId}-compare-switch` : undefined}
        />
        <Label htmlFor={compareId} className="text-xs">
          {compareLabel}
        </Label>
      </div>
    </div>
  );
}
