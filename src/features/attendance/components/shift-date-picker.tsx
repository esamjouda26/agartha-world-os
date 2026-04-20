"use client";

import { useState } from "react";
import { createParser, useQueryState } from "nuqs";
import { CalendarDays, ChevronDown } from "lucide-react";
import { format, isToday, startOfDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatIsoDateLocal, isValidIsoDate, parseIsoDateLocal } from "@/lib/date";

// Local-tz date parser. nuqs's stock `parseAsIsoDate` serializes via
// `Date#toISOString().slice(0,10)` (UTC) and parses via `new Date(str)`
// (UTC midnight), which disagrees with `format(date, "yyyy-MM-dd")` in
// local tz and drifts the round-trip by a day whenever the server is in
// a different tz from the client. This parser keeps everything in local
// tz so URL ↔ display ↔ server are consistent.
const parseAsIsoDateLocal = createParser<Date>({
  parse: (raw) => (isValidIsoDate(raw) ? parseIsoDateLocal(raw) : null),
  serialize: (date) => formatIsoDateLocal(date),
  eq: (a, b) => formatIsoDateLocal(a) === formatIsoDateLocal(b),
});

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
    parseAsIsoDateLocal
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
            // Emit the same local-tz ISO string nuqs serializes, so parent
            // optimistic UIs see the exact value that lands on the URL.
            onChange?.(formatIsoDateLocal(next));
            setOpen(false);
          }}
          disabled={(date) => date > new Date()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
