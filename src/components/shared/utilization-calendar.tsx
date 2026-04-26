"use client";

import * as React from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type DailyUtilization = {
  date: string; // YYYY-MM-DD
  bookedCount: number;
  capacity: number;
  loadPct: number;
};

export type UtilizationCalendarProps = Omit<React.ComponentProps<typeof Calendar>, "mode"> & {
  utilizationData: DailyUtilization[];
  onDateSelect?: (date: string) => void;
  selectedDate?: string | null;
};

/**
 * A shared calendar component that displays daily utilization metrics (e.g. for operations, booking, HR).
 * Renders a small utilization indicator under each date.
 */
export function UtilizationCalendar({
  utilizationData,
  onDateSelect,
  selectedDate,
  className,
  ...props
}: UtilizationCalendarProps) {
  const [month, setMonth] = React.useState<Date>(
    selectedDate ? new Date(selectedDate) : new Date(),
  );

  const utilMap = React.useMemo(() => {
    const map = new Map<string, DailyUtilization>();
    for (const d of utilizationData) {
      map.set(d.date, d);
    }
    return map;
  }, [utilizationData]);

  return (
    <Calendar
      mode="single"
      selected={selectedDate ? new Date(selectedDate) : undefined}
      onSelect={(d) => {
        if (d && onDateSelect) {
          // Format as local YYYY-MM-DD
          const offset = d.getTimezoneOffset() * 60000;
          const localDate = new Date(d.getTime() - offset).toISOString().split("T")[0];
          if (localDate) onDateSelect(localDate);
        }
      }}
      month={month}
      onMonthChange={setMonth}
      className={cn("border-border w-fit rounded-xl border p-4 shadow-xs", className)}
      components={{
        DayButton: (dayProps) => {
          // dayProps.day.date is the Date object for this cell
          const offset = dayProps.day.date.getTimezoneOffset() * 60000;
          const dateStr = new Date(dayProps.day.date.getTime() - offset)
            .toISOString()
            .split("T")[0];
          const util = dateStr ? utilMap.get(dateStr) : undefined;

          return (
            <div className="group/utilization relative flex h-full w-full flex-col items-center justify-center">
              <CalendarDayButton
                {...dayProps}
                className={cn(
                  dayProps.className,
                  "relative z-10 h-10 w-10",
                  util ? "font-bold" : "",
                )}
              />

              {util && (
                <div className="bg-muted pointer-events-none absolute bottom-1 left-1/2 z-0 h-1 w-6 -translate-x-1/2 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      util.loadPct >= 90
                        ? "bg-destructive"
                        : util.loadPct >= 70
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min(util.loadPct, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        },
      }}
      {...props}
    />
  );
}
