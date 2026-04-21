"use client";

import { useState } from "react";
import { CircleCheck, CircleDashed, StickyNote } from "lucide-react";
import { format, parseISO } from "date-fns";

import { EmptyState } from "@/components/ui/empty-state";
import { parseIsoDateLocal } from "@/lib/date";
import { PunchDetailSheet } from "@/features/attendance/components/punch-detail-sheet";
import { displayShiftName } from "@/features/attendance/utils/shift-display";
import type { MonthlyPunchesByDay } from "@/features/attendance/queries/get-monthly-punches";
import type { TodayShift } from "@/features/attendance/types";

export type DailyPunchLogProps = Readonly<{
  days: ReadonlyArray<MonthlyPunchesByDay>;
}>;

type DetailPunch = TodayShift["punches"][number];

/**
 * Day-by-day log of the staff member's own punches for the selected
 * month. Surfaces the `remark` they attached at punch time — the note
 * they *actually* wrote — so it never gets confused with a separate
 * clarification they later send to HR.
 *
 * Rows are clickable — tapping opens the same `<PunchDetailSheet>` used
 * on the Clock tab, so users see the full punch metadata (time, source,
 * note) in one place regardless of entry point.
 */
export function DailyPunchLog({ days }: DailyPunchLogProps) {
  const [selected, setSelected] = useState<DetailPunch | null>(null);

  if (days.length === 0) {
    return (
      <EmptyState
        variant="first-use"
        title="No punches recorded this month"
        description="Once you start clocking in, each punch + any note you left will appear here."
        data-testid="attendance-punch-log-empty"
      />
    );
  }

  return (
    <section
      className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4"
      data-testid="attendance-punch-log"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-foreground text-sm font-semibold tracking-tight">Your punches</h3>
        <span className="text-foreground-subtle text-xs tabular-nums">
          {days.length} {days.length === 1 ? "day" : "days"}
        </span>
      </div>
      <ul className="flex flex-col gap-4">
        {days.map((day) => (
          <li key={day.day} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <time dateTime={day.day} className="text-foreground text-sm font-medium tabular-nums">
                {format(parseIsoDateLocal(day.day), "EEE, MMM d")}
              </time>
              <span className="text-foreground-muted text-xs">
                {displayShiftName(day.shift_type_name) || "—"}
              </span>
            </div>
            <ul className="divide-border-subtle flex flex-col divide-y">
              {day.punches.map((punch) => (
                <li
                  key={punch.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setSelected({
                      id: punch.id,
                      punch_type: punch.punch_type,
                      punch_time: punch.punch_time,
                      source: punch.source,
                      remark: punch.remark,
                    })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected({
                        id: punch.id,
                        punch_type: punch.punch_type,
                        punch_time: punch.punch_time,
                        source: punch.source,
                        remark: punch.remark,
                      });
                    }
                  }}
                  className="focus-visible:outline-ring hover:bg-surface/60 -mx-1 flex cursor-pointer items-start justify-between gap-3 rounded-md px-1 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                  data-testid={`attendance-punch-log-row-${punch.id}`}
                >
                  <span className="inline-flex min-w-0 items-start gap-2">
                    <span className="mt-1">
                      {punch.punch_type === "clock_in" ? (
                        <CircleCheck
                          aria-hidden
                          className="text-status-success-foreground size-4"
                        />
                      ) : (
                        <CircleDashed aria-hidden className="text-status-info-foreground size-4" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium capitalize">
                        {punch.punch_type.replace("_", " ")}
                      </span>
                      {punch.remark ? (
                        <span className="text-foreground-muted inline-flex items-center gap-1.5 text-xs">
                          <StickyNote aria-hidden className="size-3" />
                          <span className="truncate">{punch.remark}</span>
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <time
                    dateTime={punch.punch_time}
                    className="text-foreground-muted shrink-0 tabular-nums"
                  >
                    {format(parseISO(punch.punch_time), "p")}
                  </time>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <PunchDetailSheet
        punch={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
