"use client";

import { parseAsIsoDate, useQueryState } from "nuqs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";

import { Button } from "@/components/ui/button";

/**
 * Month-picker — segmented control `◀ April 2026 ▶`.
 *
 * URL-backed via nuqs `?month=YYYY-MM-01` (first-of-month ISO). Defaults
 * to the current month. Forward navigation past the current month is
 * disabled — future stats don't exist yet.
 *
 * Tiny surface, no calendar popover. Attendance stats are browsed one
 * month at a time; a full month grid is overkill.
 */
export function MonthPicker() {
  // `shallow: false` triggers a server navigation so the RSC re-runs
  // `getMonthlyStats(...monthIso)` with the new month. Without this the
  // URL updates but stats stay frozen on the initial month.
  const [selected, setSelected] = useQueryState(
    "month",
    parseAsIsoDate
      .withDefault(startOfMonth(new Date()))
      .withOptions({ clearOnDefault: true, history: "replace", shallow: false }),
  );
  const now = startOfMonth(new Date());
  const canGoForward = selected < now;
  const label = format(selected, "LLLL yyyy");

  return (
    <div
      className="border-border bg-surface inline-flex items-center gap-0 rounded-md border"
      data-testid="attendance-month-picker"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => void setSelected(startOfMonth(subMonths(selected, 1)))}
        aria-label="Previous month"
        className="rounded-r-none"
        data-testid="attendance-month-prev"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </Button>
      <span className="min-w-[9ch] px-3 text-center text-sm font-medium tabular-nums">{label}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => void setSelected(startOfMonth(addMonths(selected, 1)))}
        disabled={!canGoForward}
        aria-label="Next month"
        className="rounded-l-none"
        data-testid="attendance-month-next"
      >
        <ChevronRight aria-hidden className="size-4" />
      </Button>
    </div>
  );
}
