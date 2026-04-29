"use client";

import * as React from "react";
import { type DayButton } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

/**
 * BookingCalendar — full-width responsive date picker for the booking wizard.
 *
 * Wraps the generic `<Calendar>` primitive with booking-specific styling:
 *   - Fills the parent container width (no `w-fit` constraint)
 *   - Large, touch-friendly day cells (48px mobile, 44px desktop)
 *   - Bold selected-date treatment with brand-primary fill
 *   - Disabled-date styling that clearly distinguishes unavailable days
 *   - Month navigation via chevron arrows (bounded by minDate/maxDate)
 *
 * This is a booking-domain sink component, not a generic calendar variant.
 * The generic `<Calendar>` in `src/components/ui/calendar.tsx` remains
 * untouched for popover/date-picker use cases.
 */

export type BookingCalendarProps = Readonly<{
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  /** Days before this date are disabled. */
  minDate: Date;
  /** Days after this date are disabled. */
  maxDate: Date;
  /**
   * When provided, only dates in this set (ISO YYYY-MM-DD) are selectable.
   * Dates outside the set are disabled even if within min/max range.
   */
  availableDates?: ReadonlySet<string>;
  className?: string;
  "data-testid"?: string;
}>;

export function BookingCalendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  availableDates,
  className,
  "data-testid": testId,
}: BookingCalendarProps) {
  // Start/end month for navigation bounds — shows arrows for all months
  // that contain at least one bookable day.
  const startMonth = React.useMemo(
    () => new Date(minDate.getFullYear(), minDate.getMonth(), 1),
    [minDate],
  );
  const endMonth = React.useMemo(
    () => new Date(maxDate.getFullYear(), maxDate.getMonth(), 1),
    [maxDate],
  );

  return (
    <div data-testid={testId ?? "booking-calendar"} className={cn("w-full", className)}>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={(d: Date) => {
          if (d < minDate || d > maxDate) return true;
          // When available dates are loaded, restrict to only those dates.
          if (availableDates && availableDates.size > 0) {
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            return !availableDates.has(iso);
          }
          return false;
        }}
        startMonth={startMonth}
        endMonth={endMonth}
        initialFocus
        className={cn(
          // Override the generic calendar's w-fit + fixed cell size.
          // Full-width, large touch targets, centered in container.
          "w-full max-w-none p-0",
          "[--cell-size:48px] sm:[--cell-size:44px]",
        )}
        classNames={{
          // Root fills container
          root: "w-full",
          // Month grid spans full width — `relative` is required for
          // the absolutely-positioned nav arrows to anchor correctly.
          months: "relative flex flex-col w-full",
          month: "flex w-full flex-col gap-3",
          // Navigation header
          nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-10",
          month_caption: "flex h-10 w-full items-center justify-center",
          caption_label: "text-sm font-semibold text-foreground select-none",
          // Table fills width
          table: "w-full border-collapse border-spacing-0",
          // Weekday headers
          weekdays: "flex w-full",
          weekday: cn(
            "flex-1 pb-2 text-center text-xs font-medium text-foreground-muted select-none",
          ),
          // Week rows
          week: "mt-0.5 flex w-full",
          // Day cells — stretch to fill, proper aspect ratio
          day: cn("group/day relative flex-1 p-0.5 text-center select-none"),
          // Today ring
          today: cn("rounded-lg ring-1 ring-brand-primary/30", "data-[selected=true]:ring-0"),
          // Outside month days
          outside: "text-foreground-disabled opacity-40",
          // Disabled days
          disabled: "text-foreground-disabled opacity-30 cursor-not-allowed",
          hidden: "invisible",
        }}
        components={{
          DayButton: BookingDayButton,
        }}
      />
    </div>
  );
}

/**
 * Custom day button that fills the cell with large touch targets.
 *
 * Selected state uses brand-primary with strong visual weight.
 * Hover/focus states use surface tint for discoverability.
 */
function BookingDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isSelected = modifiers.selected;
  const isToday = modifiers.today;
  const isOutside = modifiers.outside;
  const isDisabled = modifiers.disabled;

  // Outside-month days: render an empty placeholder to preserve the
  // grid layout without showing adjacent month numbers.
  if (isOutside) {
    return <span className="aspect-square w-full" aria-hidden />;
  }

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={isSelected}
      disabled={isDisabled}
      className={cn(
        // Base: full-width cell, centered content, touch-friendly
        "relative flex w-full items-center justify-center",
        "aspect-square rounded-lg text-sm font-medium outline-none",
        "transition-[background-color,color,box-shadow] duration-[var(--duration-tactile)]",
        // Default state
        "text-foreground",
        // Hover & focus
        !isSelected &&
          !isDisabled &&
          !isOutside && [
            "hover:bg-surface hover:text-foreground",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1",
          ],
        // Selected state — strong brand fill
        isSelected && [
          "bg-brand-primary text-brand-primary-foreground font-semibold",
          "shadow-sm",
          "hover:bg-brand-primary/90",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
        ],
        // Today (unselected) — subtle ring
        isToday && !isSelected && "text-brand-primary font-semibold",
        // Outside month
        isOutside && "text-foreground-disabled opacity-40",
        // Disabled
        isDisabled && "cursor-not-allowed opacity-30",
        className,
      )}
      {...props}
    />
  );
}
