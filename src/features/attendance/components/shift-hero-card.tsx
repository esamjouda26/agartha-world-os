"use client";

import { Clock } from "lucide-react";
import { parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { assertNever } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { TodayShift } from "@/features/attendance/types";
import type { deriveButtonState } from "@/features/attendance/components/derive-button-state";
import {
  displayShiftName,
  displayShiftWindow,
} from "@/features/attendance/components/shift-display";

/**
 * ShiftHeroCard — the attention-anchor of the Clock In/Out tab.
 *
 * Premium redesign: deeper radius, warm-gold gradient wash across the
 * top, an optional radial glow in the corner (dark-mode only), and a
 * stepped information hierarchy (eyebrow → title → window → elapsed
 * → action). The primary action sits at the card's bottom edge so on
 * mobile it falls naturally into the thumb zone.
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
  const shiftWindow = displayShiftWindow(shift) ?? "—";

  const clockInPunch = shift.punches.find((p) => p.punch_type === "clock_in");
  const clockOutPunch = shift.punches.find((p) => p.punch_type === "clock_out");
  const isLive = isToday && Boolean(clockInPunch) && !clockOutPunch;
  const elapsed = isLive ? elapsedBetween(parseISO(clockInPunch!.punch_time), now) : null;

  return (
    <section
      data-testid="attendance-shift-hero"
      className={cn(
        "border-border bg-card relative isolate overflow-hidden rounded-2xl border shadow-sm",
        // Atmospheric: warm gold halo in dark mode. Harmless no-op in light.
        "dark:shadow-glow-brand/40",
      )}
    >
      {/* Top wash — soft gold gradient bleeding out of the card's top edge.
          Restrained alpha so it frames the title without overpowering it. */}
      <div
        aria-hidden
        className="from-brand-primary/10 via-brand-primary/[0.04] pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent"
      />

      {/* Decorative radial glow — pronounced in dark mode for the
          "live-on-shift" state. Hidden for non-today / read-only. */}
      {isLive ? (
        <div
          aria-hidden
          className="bg-brand-primary/10 dark:bg-brand-primary/20 pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl"
        />
      ) : null}

      <div className="relative flex flex-col gap-6 p-6 sm:p-8">
        <header className="flex flex-col gap-2">
          <p
            className="text-brand-primary text-[11px] font-medium tracking-wider uppercase"
            data-testid="attendance-shift-eyebrow"
          >
            {isToday ? "Today's shift" : "Shift"}
          </p>
          <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
            {name}
          </h2>
          <p className="text-foreground-muted inline-flex items-center gap-1.5 text-sm tabular-nums">
            <Clock aria-hidden className="size-4" />
            {shiftWindow}
          </p>
        </header>

        {elapsed ? (
          <div
            className="border-border-subtle flex items-baseline justify-between gap-3 border-t pt-5"
            data-testid="attendance-elapsed"
          >
            <p className="text-foreground-subtle text-[11px] font-medium tracking-wider uppercase">
              On shift
            </p>
            <p className="text-status-success-foreground text-4xl font-semibold tracking-tighter tabular-nums">
              {elapsed}
            </p>
          </div>
        ) : null}

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
        className="min-h-[56px] w-full text-base"
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
        className="min-h-[56px] w-full text-base"
        data-testid="attendance-clock-complete"
      >
        Shift complete
      </Button>
    );
  }
  if (buttonState.kind === "no-shift") {
    return (
      <Button size="lg" variant="secondary" disabled className="min-h-[56px] w-full text-base">
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
        className="min-h-[56px] w-full text-base"
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
        className="min-h-[56px] w-full text-base"
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
        className="min-h-[56px] w-full text-base"
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
