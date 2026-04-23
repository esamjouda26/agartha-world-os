"use client";

import * as React from "react";
import { format, subDays, startOfMonth, startOfYear, startOfDay } from "date-fns";
import { CalendarIcon, ChevronLeft, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * DateRangePicker — from/to selection with preset chips.
 *
 * Controlled: caller owns `value` (`{ from, to } | null`) + `onChange`.
 * Presets are rendered as a left column inside the popover for single-
 * click common ranges (Today, 7d, 30d, MTD, YTD, Custom). Custom opens
 * the two-month calendar for manual picks.
 *
 * Used by Reports, Attendance, Procurement, Inventory — ~12× references
 * across `frontend_spec.md`. Date-only domain data should parse via
 * `parseIsoDateLocal` (`@/lib/date`) before round-trip through this
 * component.
 */

export type DateRangeValue = Readonly<{ from: Date; to: Date }>;

export type DateRangePreset = Readonly<{
  id: string;
  label: string;
  /** Returns the range when selected. */
  resolve: () => DateRangeValue;
}>;

function today(): Date {
  return startOfDay(new Date());
}

export const DEFAULT_DATE_RANGE_PRESETS: readonly DateRangePreset[] = [
  {
    id: "today",
    label: "Today",
    resolve: () => {
      const t = today();
      return { from: t, to: t };
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    resolve: () => {
      const y = subDays(today(), 1);
      return { from: y, to: y };
    },
  },
  {
    id: "7d",
    label: "Last 7 days",
    resolve: () => ({ from: subDays(today(), 6), to: today() }),
  },
  {
    id: "30d",
    label: "Last 30 days",
    resolve: () => ({ from: subDays(today(), 29), to: today() }),
  },
  {
    id: "mtd",
    label: "Month to date",
    resolve: () => ({ from: startOfMonth(today()), to: today() }),
  },
  {
    id: "ytd",
    label: "Year to date",
    resolve: () => ({ from: startOfYear(today()), to: today() }),
  },
];

export type DateRangePickerProps = Readonly<{
  value: DateRangeValue | null;
  onChange: (value: DateRangeValue | null) => void;
  placeholder?: string;
  /** `date-fns#format` pattern applied to both from and to. */
  displayFormat?: string;
  presets?: readonly DateRangePreset[];
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  clearable?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  id?: string;
  className?: string;
  "data-testid"?: string;
}>;

function formatRange(value: DateRangeValue, pattern: string): string {
  if (value.from.getTime() === value.to.getTime()) return format(value.from, pattern);
  return `${format(value.from, pattern)} – ${format(value.to, pattern)}`;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  displayFormat = "LLL d, y",
  presets = DEFAULT_DATE_RANGE_PRESETS,
  minDate,
  maxDate,
  disabled = false,
  clearable = false,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  id,
  className,
  "data-testid": testId,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<"presets" | "calendar">("presets");
  // `from` / `to` carry an explicit `| undefined` to satisfy
  // `exactOptionalPropertyTypes` AND match react-day-picker's range
  // selection callback shape (which always passes `Date | undefined`).
  const [draftRange, setDraftRange] = React.useState<
    { from?: Date | undefined; to?: Date | undefined } | undefined
  >(value ?? undefined);

  React.useEffect(() => {
    if (open) {
      setView("presets");
      setDraftRange(value ?? undefined);
    }
  }, [open, value]);

  const activePresetId = React.useMemo(() => {
    if (!value) return null;
    const match = presets.find((preset) => {
      const range = preset.resolve();
      return (
        range.from.getTime() === value.from.getTime() && range.to.getTime() === value.to.getTime()
      );
    });
    return match?.id ?? null;
  }, [value, presets]);

  const handleSelect = (
    range: { from?: Date | undefined; to?: Date | undefined } | undefined,
  ): void => {
    setDraftRange(range);
  };

  const handleApply = (): void => {
    if (!draftRange?.from) {
      onChange(null);
      setOpen(false);
      return;
    }
    onChange({ from: draftRange.from, to: draftRange.to ?? draftRange.from });
    setOpen(false);
  };

  const handlePreset = (preset: DateRangePreset): void => {
    onChange(preset.resolve());
    setOpen(false);
  };

  const handleClear = (event: React.MouseEvent): void => {
    event.stopPropagation();
    onChange(null);
  };

  const disabledMatcher = React.useMemo(() => {
    if (!minDate && !maxDate) return undefined;
    return (day: Date): boolean => {
      if (minDate && day < minDate) return true;
      if (maxDate && day > maxDate) return true;
      return false;
    };
  }, [minDate, maxDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          {...(id !== undefined ? { id } : {})}
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          aria-invalid={ariaInvalid || undefined}
          data-testid={testId}
          data-slot="date-range-picker-trigger"
          className={cn(
            "h-10 w-full justify-between font-normal",
            !value && "text-foreground-subtle",
            ariaInvalid && "border-destructive",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <CalendarIcon aria-hidden className="size-4 shrink-0" />
            {value ? formatRange(value, displayFormat) : placeholder}
          </span>
          {clearable && value ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear range"
              onClick={handleClear}
              data-testid={testId ? `${testId}-clear` : undefined}
              className="text-foreground-subtle hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded"
            >
              <X aria-hidden className="size-3.5" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        {view === "presets" ? (
          <div data-slot="date-range-presets" className="flex min-w-[12rem] flex-col p-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant={activePresetId === preset.id ? "secondary" : "ghost"}
                size="sm"
                data-active={activePresetId === preset.id || undefined}
                onClick={() => handlePreset(preset)}
                data-testid={testId ? `${testId}-preset-${preset.id}` : undefined}
                className="h-9 justify-start text-sm"
              >
                {preset.label}
              </Button>
            ))}
            <div className="bg-border-subtle my-1 h-px" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setView("calendar")}
              className="text-foreground-muted h-9 justify-start text-sm"
            >
              Custom Range...
            </Button>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="border-border-subtle flex items-center border-b p-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 rounded-sm"
                onClick={() => setView("presets")}
                aria-label="Back to presets"
              >
                <ChevronLeft aria-hidden className="size-4" />
              </Button>
              <span className="text-foreground flex-1 pr-7 text-center text-sm font-medium">
                Custom Range
              </span>
            </div>
            <div className="p-2">
              <Calendar
                mode="range"
                required={false}
                numberOfMonths={1}
                {...(draftRange?.from
                  ? {
                      selected: {
                        from: draftRange.from,
                        ...(draftRange.to ? { to: draftRange.to } : {}),
                      },
                    }
                  : {})}
                {...(value?.from ? { defaultMonth: value.from } : {})}
                onSelect={handleSelect}
                {...(disabledMatcher ? { disabled: disabledMatcher } : {})}
                initialFocus
              />
            </div>
            <div className="border-border-subtle flex items-center justify-between border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDraftRange(undefined)}
                className="text-xs"
              >
                Clear Selection
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleApply}
                className="text-xs"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
