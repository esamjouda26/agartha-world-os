"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { motion, slideUp, usePrefersReducedMotion, motionOrStill } from "@/lib/motion";
import type { TodayShift } from "@/features/attendance/types";
import { deriveButtonState } from "@/features/attendance/utils/derive-button-state";
import { PunchDialog } from "@/features/attendance/components/punch-dialog";
import { PunchTimeline } from "@/features/attendance/components/punch-timeline";
import { ShiftDatePicker } from "@/features/attendance/components/shift-date-picker";
import { ShiftHeroCard } from "@/features/attendance/components/shift-hero-card";

type Props = Readonly<{
  shift: TodayShift | null;
  todayIso: string;
  /** ISO date for the *selected* day (may differ from today when the
   * user browses past shifts via the date picker). */
  selectedDateIso: string;
}>;

/**
 * Tab-1 "Clock In/Out" surface — composes extracted feature primitives:
 *   - `<ShiftDatePicker>` to switch days (today → actionable; past → read-only).
 *   - `<ShiftHeroCard>` for the hero summary + state-aware primary button.
 *   - `<PunchDialog>` for the capture → preview → confirm flow.
 *   - `<PunchTimeline>` for today's punch log with click-through detail and
 *     5-minute Undo on the latest punch.
 *
 * This file is now a layout orchestrator — each visual concern lives in
 * its own module per the feature-local file convention.
 */
export function ClockInOutPanel({ shift, todayIso, selectedDateIso }: Props) {
  const reduced = usePrefersReducedMotion();
  const panelMotion = motionOrStill(slideUp({ duration: "layout" }), reduced);
  const [dialogKind, setDialogKind] = useState<"clock-in" | "clock-out" | null>(null);

  const isTodayView = selectedDateIso === todayIso;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const buttonState = useMemo(
    () => (isTodayView ? deriveButtonState(now, shift) : { kind: "read-only" as const }),
    [isTodayView, now, shift],
  );

  return (
    <motion.div
      {...panelMotion}
      className="flex flex-col gap-5 pb-[calc(var(--shell-bottom-inset,0px)+theme(spacing.6))]"
      data-testid="attendance-clock-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ShiftDatePicker />
        {!isTodayView ? (
          <StatusBadge
            status="history"
            tone="neutral"
            label="Read only"
            data-testid="attendance-history-badge"
          />
        ) : null}
      </div>

      {shift ? (
        <ShiftHeroCard
          shift={shift}
          isToday={isTodayView}
          now={now}
          buttonState={buttonState}
          onClockIn={() => setDialogKind("clock-in")}
          onClockOut={() => setDialogKind("clock-out")}
        />
      ) : (
        <EmptyState
          variant="first-use"
          title={isTodayView ? "You're not scheduled today" : "No shift on this date"}
          description={
            isTodayView
              ? "Nothing to clock in to right now. Pick another date to review past shifts."
              : "There's no recorded shift for the selected date."
          }
          data-testid="attendance-clock-no-shift"
        />
      )}

      {shift && shift.punches.length > 0 ? (
        <PunchTimeline shift={shift} isTodayView={isTodayView} now={now} />
      ) : null}

      {/* Dialog lives at panel scope so its lifecycle is tied to the tab,
          not the hero card. Only mount when viewing today — historical
          dates are read-only. */}
      {shift && isTodayView ? (
        <PunchDialog
          open={dialogKind !== null}
          onOpenChange={(next) => !next && setDialogKind(null)}
          kind={dialogKind ?? "clock-in"}
          shift={shift}
        />
      ) : null}
    </motion.div>
  );
}
