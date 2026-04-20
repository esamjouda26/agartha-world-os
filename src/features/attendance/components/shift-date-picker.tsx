"use client";

import { useState } from "react";
import { parseAsIsoDate, useQueryState } from "nuqs";
import { CalendarDays, ChevronDown } from "lucide-react";
import { format, isToday, startOfDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Date picker for Tab-1 (Clock In/Out).
 *
 * URL-backed via nuqs `?date=YYYY-MM-DD`. Defaults to today. The picker
 * blocks future dates (scheduling is HR's concern; crew only look back or
 * at today). When the selected date is today, the parent renders the full
 * clock surface; any past date renders a read-only history view — that
 * branching is the parent's responsibility, not the picker's.
 *
 * Display format: "Today · Mon, Apr 20" when date is today; full date
 * otherwise. Small, chip-style trigger to avoid competing with the clock
 * action for visual weight.
 */
export function ShiftDatePicker({ onChange }: Readonly<{ onChange?: (iso: string) => void }>) {
  const [open, setOpen] = useState(false);
  // `shallow: false` is mandatory — without it nuqs only updates the URL
  // client-side and the RSC tree never re-runs `getTodayShift` with the new
  // date. Date picker would look like it worked but content wouldn't change.
  const [selected, setSelected] = useQueryState(
    "date",
    parseAsIsoDate
      .withDefault(startOfDay(new Date()))
      .withOptions({ clearOnDefault: true, history: "replace", shallow: false }),
  );
  const today = isToday(selected);
  const label = today
    ? `Today · ${format(selected, "EEE, MMM d")}`
    : format(selected, "EEE, MMM d yyyy");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 font-medium"
          data-testid="attendance-date-picker"
        >
          <CalendarDays aria-hidden className="size-4" />
          {label}
          <ChevronDown aria-hidden className="size-3.5 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(next) => {
            if (!next) return;
            void setSelected(next);
            onChange?.(format(next, "yyyy-MM-dd"));
            setOpen(false);
          }}
          disabled={(date) => date > new Date()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
