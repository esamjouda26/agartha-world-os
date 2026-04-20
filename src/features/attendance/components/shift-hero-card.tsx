"use client";

import { Clock } from "lucide-react";
import { parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { assertNever } from "@/lib/errors";
import type { TodayShift } from "@/features/attendance/types";
import type { deriveButtonState } from "@/features/attendance/components/derive-button-state";
import {
  displayShiftName,
  displayShiftWindow,
} from "@/features/attendance/components/shift-display";

/**
 * The hero card at the top of the Clock In/Out tab.
 *
 * Surfaces the shift label, the expected window, an optional elapsed-time
 * chip (shown once the user has clocked in), and the state-aware primary
 * action button. Extracted from the parent panel so each concern lives in
 * its own file per feature-module convention.
 */

type ButtonState = ReturnType<typeof deriveButtonState> | { kind: "read-only" };

export type ShiftHeroCardProps = Readonly<{
  shift: TodayShift;
  isToday: boolean;
  now: Date;
  buttonState: ButtonState;
  onClockIn: () => void;
  onClockOut: () => void;
}>;

export function ShiftHeroCard({
  shift,
  isToday,
  now,
  buttonState,
  onClockIn,
  onClockOut,
}: ShiftHeroCardProps) {
  const name = displayShiftName(shift.shiftType.name);
  const window = displayShiftWindow(shift) ?? "—";

  // Running timer from the first clock-in punch (if any).
  const clockInPunch = shift.punches.find((p) => p.punch_type === "clock_in");
  const clockOutPunch = shift.punches.find((p) => p.punch_type === "clock_out");
  const elapsed =
    isToday && clockInPunch && !clockOutPunch
      ? elapsedBetween(parseISO(clockInPunch.punch_time), now)
      : null;

  return (
    <section
      data-testid="attendance-shift-hero"
      className="border-border bg-card relative overflow-hidden rounded-xl border shadow-xs"
    >
      <div
        aria-hidden
        className="from-brand-primary/5 absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent"
      />

      <div className="relative flex flex-col gap-4 p-5 sm:gap-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
              {isToday ? "Today's shift" : "Shift"}
            </p>
            <h2 className="text-foreground mt-1 text-xl font-semibold tracking-tight">{name}</h2>
            <p className="text-foreground-muted mt-1 inline-flex items-center gap-1.5 text-sm tabular-nums">
              <Clock aria-hidden className="size-4" />
              {window}
            </p>
          </div>

          {elapsed ? (
            <div
              className="bg-status-success-bg-soft text-status-success-foreground border-status-success-border flex flex-col items-end rounded-lg border px-3 py-2 text-right"
              data-testid="attendance-elapsed"
            >
              <span className="text-[11px] font-medium tracking-wide uppercase">On shift</span>
              <span className="text-base font-semibold tabular-nums">{elapsed}</span>
            </div>
          ) : null}
        </div>

        <PrimaryAction buttonState={buttonState} onClockIn={onClockIn} onClockOut={onClockOut} />
      </div>
    </section>
  );
}

function PrimaryAction({
  buttonState,
  onClockIn,
  onClockOut,
}: Readonly<{
  buttonState: ButtonState;
  onClockIn: () => void;
  onClockOut: () => void;
}>) {
  if (buttonState.kind === "read-only") {
    return (
      <Button
        size="lg"
        variant="secondary"
        disabled
        className="min-h-[52px] w-full"
        data-testid="attendance-clock-readonly"
      >
        Viewing history · actions unavailable
      </Button>
    );
  }
  if (buttonState.kind === "complete") {
    return (
      <Button
        size="lg"
        variant="secondary"
        disabled
        className="min-h-[52px] w-full"
        data-testid="attendance-clock-complete"
      >
        Shift complete
      </Button>
    );
  }
  if (buttonState.kind === "no-shift") {
    return (
      <Button size="lg" variant="secondary" disabled className="min-h-[52px] w-full">
        No shift to clock into
      </Button>
    );
  }
  if (buttonState.kind === "outside-window") {
    return (
      <Button
        size="lg"
        variant="secondary"
        disabled
        className="min-h-[52px] w-full"
        data-testid="attendance-clock-outside-window"
      >
        {buttonState.reason === "too-early" ? "Clock-in opens soon" : "Clock window closed"}
      </Button>
    );
  }
  if (buttonState.kind === "clock-in") {
    return (
      <Button
        size="lg"
        onClick={onClockIn}
        className="min-h-[52px] w-full text-base"
        data-testid="attendance-clock-in"
      >
        Clock in
      </Button>
    );
  }
  if (buttonState.kind === "clock-out") {
    return (
      <Button
        size="lg"
        variant="destructive"
        onClick={onClockOut}
        className="min-h-[52px] w-full text-base"
        data-testid="attendance-clock-out"
      >
        Clock out
      </Button>
    );
  }
  return assertNever(buttonState, "PrimaryAction buttonState");
}

function elapsedBetween(start: Date, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}
