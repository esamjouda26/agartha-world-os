"use client";

import { useCallback, useMemo } from "react";
import { createParser, useQueryState } from "nuqs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";

import { Button } from "@/components/ui/button";
import { formatIsoDateLocal, isValidIsoDate, parseIsoDateLocal } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { MonthlyPunchesByDay } from "@/features/attendance/queries/get-monthly-punches";

/**
 * Monthly mini-calendar with attendance dots. Lives in the desktop aside
 * (lg+) and gives the user a at-a-glance view of which days they've
 * clocked in on for the active month.
 *
 * Each day cell shows:
 *   - Day number
 *   - A small colored dot when the day has at least one non-voided punch
 *     (the `punches` prop already excludes voided entries)
 *   - A gold ring when the day is `todayIso`
 *   - A filled gold fill when the day equals the URL's `?date=` selection
 *
 * Clicking a day in the current month updates `?date=` (and nuqs
 * navigates via the shift-date-picker's contract — same URL surface).
 * Days outside the displayed month are faded and inert.
 */

const parseAsIsoDateLocal = createParser<Date>({
  parse: (raw) => (isValidIsoDate(raw) ? parseIsoDateLocal(raw) : null),
  serialize: (date) => formatIsoDateLocal(date),
  eq: (a, b) => formatIsoDateLocal(a) === formatIsoDateLocal(b),
});

export type MonthlyAttendanceCalendarProps = Readonly<{
  monthIso: string;
  todayIso: string;
  selectedDateIso: string;
  punches: ReadonlyArray<MonthlyPunchesByDay>;
}>;

const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function MonthlyAttendanceCalendar({
  monthIso,
  todayIso,
  selectedDateIso,
  punches,
}: MonthlyAttendanceCalendarProps) {
  // `?month=` param drives the displayed month. Share the same URL contract
  // as the MonthPicker inside the Stats tab so the calendar and the stats
  // panel stay in lockstep.
  const [monthDate, setMonthDate] = useQueryState(
    "month",
    parseAsIsoDateLocal
      .withDefault(parseIsoDateLocal(monthIso))
      .withOptions({ clearOnDefault: true, history: "replace", shallow: false }),
  );
  const [, setDate] = useQueryState(
    "date",
    parseAsIsoDateLocal.withOptions({ clearOnDefault: true, history: "replace", shallow: false }),
  );

  const daysWithPunches = useMemo(() => new Set(punches.map((p) => p.day)), [punches]);

  const today = parseIsoDateLocal(todayIso);
  const selected = parseIsoDateLocal(selectedDateIso);
  const monthAnchor = startOfMonth(monthDate);
  const canGoForward = monthAnchor < startOfMonth(today);

  const grid = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);

  const onPickDay = useCallback(
    (day: Date) => {
      void setDate(day);
    },
    [setDate],
  );

  return (
    <section
      aria-label="Monthly attendance calendar"
      data-testid="attendance-month-calendar"
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs"
    >
      <header className="flex items-center justify-between gap-2">
        <p className="text-foreground text-sm font-semibold tracking-tight">
          {format(monthAnchor, "LLLL yyyy")}
        </p>
        <div className="border-border bg-surface inline-flex items-center rounded-md border">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void setMonthDate(startOfMonth(subMonths(monthAnchor, 1)))}
            aria-label="Previous month"
            className="rounded-r-none"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void setMonthDate(startOfMonth(addMonths(monthAnchor, 1)))}
            disabled={!canGoForward}
            aria-label="Next month"
            className="rounded-l-none"
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1" role="grid">
        {DAY_HEADERS.map((h, i) => (
          <div
            key={`h${i}`}
            role="columnheader"
            className="text-foreground-subtle text-center text-[10px] font-medium tracking-wider uppercase"
            aria-label={
              ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]
            }
          >
            {h}
          </div>
        ))}
        {grid.map((day) => {
          const inMonth = day.getMonth() === monthAnchor.getMonth();
          const dayIso = formatIsoDateLocal(day);
          const isToday = dayIso === todayIso;
          const isSelected = dayIso === formatIsoDateLocal(selected);
          const hasPunch = daysWithPunches.has(dayIso);
          const isFuture = day > today;
          const disabled = !inMonth || isFuture;

          return (
            <button
              key={dayIso}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-label={format(day, "EEEE, MMM d yyyy")}
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              onClick={() => onPickDay(day)}
              className={cn(
                "focus-visible:outline-ring relative flex aspect-square items-center justify-center rounded-md text-[11px] font-medium transition-colors duration-[var(--duration-micro)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
                disabled
                  ? "text-foreground-disabled cursor-not-allowed"
                  : "hover:bg-surface cursor-pointer",
                !inMonth && "opacity-40",
                isSelected &&
                  "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary",
                !isSelected && isToday && "ring-brand-primary/60 text-foreground ring-1 ring-inset",
                !isSelected && !isToday && "text-foreground",
              )}
            >
              <span className="tabular-nums">{day.getDate()}</span>
              {hasPunch && !isSelected ? (
                <span
                  aria-hidden
                  className="bg-status-success-solid absolute right-1 bottom-1 size-1 rounded-full"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <Legend />
    </section>
  );
}

function Legend() {
  return (
    <div className="text-foreground-subtle flex items-center gap-3 text-[10px]">
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="bg-status-success-solid inline-block size-1.5 rounded-full" />
        Clocked in
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="ring-brand-primary/60 inline-block size-2 rounded-sm ring-1" />
        Today
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="bg-brand-primary inline-block size-1.5 rounded-full" />
        Selected
      </span>
    </div>
  );
}

/**
 * Build a 7×6 (42-cell) grid spanning from the last-Sunday-before-monthStart
 * through the first-Saturday-after-monthEnd. Simpler than slicing to 35/42
 * dynamically and keeps the grid height stable across months.
 */
function buildMonthGrid(monthAnchor: Date): Date[] {
  const firstDay = startOfMonth(monthAnchor);
  const firstWeekday = firstDay.getDay(); // 0 = Sun
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}
