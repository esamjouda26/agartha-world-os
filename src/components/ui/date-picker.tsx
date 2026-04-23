"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * DatePicker — single-date trigger + calendar popover.
 *
 * Controlled: caller owns `value` (a `Date` or `null`) + `onChange`.
 * No internal state beyond open/close. Use `<DateRangePicker>` for
 * from/to selection.
 *
 * Date rendering uses `date-fns#format` — DO NOT pass timezone-sensitive
 * ISO strings through this primitive. For date-only DB columns (`DATE`),
 * parse via `parseIsoDateLocal` (`@/lib/date`) before passing in.
 */

export type DatePickerProps = Readonly<{
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  /** Format passed to `date-fns#format`. Defaults to "PPP" (e.g. "Apr 22, 2026"). */
  displayFormat?: string;
  /** Optional min / max constraints. */
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

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  displayFormat = "PPP",
  minDate,
  maxDate,
  disabled = false,
  clearable = false,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  id,
  className,
  "data-testid": testId,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (next: Date | undefined): void => {
    onChange(next ?? null);
    if (next) setOpen(false);
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
          data-slot="date-picker-trigger"
          className={cn(
            "h-10 w-full justify-between font-normal",
            !value && "text-foreground-subtle",
            ariaInvalid && "border-destructive",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <CalendarIcon aria-hidden className="size-4 shrink-0" />
            {value ? format(value, displayFormat) : placeholder}
          </span>
          {clearable && value ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date"
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
        <Calendar
          mode="single"
          {...(value !== null ? { selected: value } : {})}
          onSelect={handleSelect}
          {...(disabledMatcher ? { disabled: disabledMatcher } : {})}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
