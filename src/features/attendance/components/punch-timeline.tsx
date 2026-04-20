"use client";

import { useMemo, useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import { differenceInSeconds, format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";
import type { TodayShift } from "@/features/attendance/types";
import { PunchDetailSheet } from "@/features/attendance/components/punch-detail-sheet";
import { UndoPunchButton } from "@/features/attendance/components/undo-punch-button";

// Keep in sync with the RPC's `v_void_window` in migration
// 20260420052116_add_rpc_void_own_punch.sql. Client-side check is UX
// only — the server enforces it authoritatively.
const VOID_WINDOW_SECONDS = 60 * 60;

type Punch = TodayShift["punches"][number];

export type PunchTimelineProps = Readonly<{
  shift: TodayShift;
  isTodayView: boolean;
  now: Date;
}>;

/**
 * Today's punch timeline. Rendered below the hero card on the Clock tab.
 *
 * Each row is clickable — tapping opens a detail sheet with the punch's
 * full metadata and the note the user attached at punch time. The most
 * recent punch on today's view shows an inline "Undo" button that voids
 * within the grace window.
 */
export function PunchTimeline({ shift, isTodayView, now }: PunchTimelineProps) {
  const [selectedPunchId, setSelectedPunchId] = useState<string | null>(null);

  const punches = useMemo(
    () =>
      [...shift.punches].sort(
        (a, b) => parseISO(b.punch_time).getTime() - parseISO(a.punch_time).getTime(),
      ),
    [shift.punches],
  );
  const latest = punches[0];
  const selectedPunch = punches.find((p) => p.id === selectedPunchId) ?? null;

  // Mobile (< sm): horizontal scroll-snap list of punch cards — swipe to
  // navigate when multiple punches exist. Desktop (≥ sm): vertical divide
  // list (previous layout). Single-punch case renders identically in both
  // layouts (only one card, no scroll affordance).
  const hasMultiple = punches.length > 1;

  return (
    <section
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs"
      data-testid="attendance-punch-timeline"
    >
      <p className="text-foreground-subtle text-[11px] font-medium tracking-wider uppercase">
        Today&apos;s punches
      </p>
      <ul
        className={cn(
          // Mobile: horizontal scroll-snap. Each card snaps to the viewport's
          // left edge. `-mx-4 px-4` extends the scroll area to the card
          // padding edge so the first/last cards rest flush with the panel
          // border without awkward spacing.
          hasMultiple
            ? "sm:divide-border-subtle -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:snap-none sm:flex-col sm:gap-0 sm:divide-y sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
            : "divide-border-subtle flex flex-col divide-y",
        )}
      >
        {punches.map((punch) => {
          const isLatest = punch.id === latest?.id;
          const secondsSince = differenceInSeconds(now, parseISO(punch.punch_time));
          const canUndo =
            isTodayView && isLatest && secondsSince >= 0 && secondsSince <= VOID_WINDOW_SECONDS;
          return (
            <PunchRow
              key={punch.id}
              punch={punch}
              canUndo={canUndo}
              secondsLeft={VOID_WINDOW_SECONDS - secondsSince}
              multiple={hasMultiple}
              onClick={() => setSelectedPunchId(punch.id)}
            />
          );
        })}
      </ul>

      <PunchDetailSheet
        punch={selectedPunch}
        open={selectedPunch !== null}
        onClose={() => setSelectedPunchId(null)}
      />
    </section>
  );
}

type PunchRowProps = Readonly<{
  punch: Punch;
  canUndo: boolean;
  secondsLeft: number;
  multiple: boolean;
  onClick: () => void;
}>;

function PunchRow({ punch, canUndo, secondsLeft, multiple, onClick }: PunchRowProps) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      // Mobile (multiple punches): each row is a snap-start card that
      // fills 85% of the viewport for thumb-swipe navigation. On sm+ it
      // reverts to the standard inline row. Single-punch case reuses the
      // inline row at every viewport.
      className={cn(
        "focus-visible:outline-ring flex cursor-pointer items-center justify-between gap-3 text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
        multiple
          ? "border-border-subtle bg-surface/50 sm:hover:bg-surface/60 min-w-[85%] shrink-0 snap-start rounded-lg border px-3 py-3 sm:-mx-1 sm:min-w-0 sm:shrink sm:rounded-md sm:border-0 sm:bg-transparent sm:px-1 sm:py-2"
          : "hover:bg-surface/60 -mx-1 rounded-md px-1 py-2",
      )}
      data-testid={`attendance-punch-row-${punch.id}`}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${
            punch.punch_type === "clock_in" ? "bg-status-success-solid" : "bg-status-info-solid"
          }`}
        />
        <span className="font-medium capitalize">{punch.punch_type.replace("_", " ")}</span>
        {punch.remark ? (
          <span className="text-foreground-muted truncate">· {punch.remark}</span>
        ) : null}
      </span>
      <span className="inline-flex items-center gap-3">
        <span className="text-foreground-muted inline-flex items-center gap-1 tabular-nums">
          <MapPin aria-hidden className="size-3" />
          <time dateTime={punch.punch_time}>{format(parseISO(punch.punch_time), "p")}</time>
        </span>
        {canUndo ? <UndoPunchButton punchId={punch.id} secondsLeft={secondsLeft} /> : null}
        <ChevronRight aria-hidden className="text-foreground-muted size-4" />
      </span>
    </li>
  );
}
