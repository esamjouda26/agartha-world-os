"use client";

import * as React from "react";
import { Clock, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { AvailableSlot } from "@/features/booking/types/wizard";

/**
 * TimeSlotGrid — clickable grid of available time slots for a given date.
 *
 * Spec: frontend_spec.md:3419-3420 ("Select date → rpc_get_available_slots
 * → available slot grid; Select time slot").
 *
 * Density: 2 columns on <sm, 3 on sm/md, 4 on lg+ (Spec interpretation
 * default — premium booking UX). Slots that are full or unavailable for
 * the current group size remain visible but `aria-disabled`, so guests
 * see the demand pattern (Resy / Klook precedent).
 */

export type TimeSlotGridProps = Readonly<{
  slots: readonly AvailableSlot[];
  selectedSlotId: string | null;
  onSelect: (slot: AvailableSlot) => void;
  loading?: boolean;
  guestCount: number;
  className?: string;
  "data-testid"?: string;
}>;

function formatTime(hhmmss: string): string {
  // Display the slot start in 12-hour form. The DB stores HH:MM:SS in the
  // facility timezone (operational_workflows.md treats time_slots.start_time
  // as facility-local), so we don't apply any TZ conversion here.
  const [hStr = "00", mStr = "00"] = hhmmss.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

const LOW_REMAINING_THRESHOLD = 5;

export function TimeSlotGrid({
  slots,
  selectedSlotId,
  onSelect,
  loading = false,
  guestCount,
  className,
  "data-testid": testId,
}: TimeSlotGridProps) {
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid={testId ? `${testId}-loading` : "time-slot-grid-loading"}
        className={cn(
          "border-border-subtle bg-card flex items-center justify-center rounded-lg border px-6 py-12",
          className,
        )}
      >
        <Loader2 aria-hidden className="text-foreground-muted size-5 animate-spin" />
        <span className="text-foreground-muted ml-2 text-sm">Loading slots…</span>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <EmptyState
        variant="filtered-out"
        title="No slots available for this date."
        description="Pick a different date or adjust your guest count to see availability."
        data-testid={testId ? `${testId}-empty` : "time-slot-grid-empty"}
      />
    );
  }

  // Selectable slots only — disabled (sold out) ones are skipped by
  // arrow-key navigation so the focus ring doesn't bounce off dead tiles.
  const selectableSlots = slots.filter((s) => s.is_available && s.slot_remaining >= guestCount);
  const selectedIdxAmongSelectable = selectableSlots.findIndex((s) => s.slot_id === selectedSlotId);
  // First selectable index by slot_id — used as the tab-stop anchor when
  // nothing is selected yet.
  const firstSelectableSlotId = selectableSlots[0]?.slot_id ?? null;
  const buttonRefs = React.useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const moveFocus = (delta: number): void => {
    if (selectableSlots.length === 0) return;
    const cur = selectedIdxAmongSelectable >= 0 ? selectedIdxAmongSelectable : 0;
    const next = (cur + delta + selectableSlots.length) % selectableSlots.length;
    const target = selectableSlots[next];
    if (!target) return;
    onSelect(target);
    requestAnimationFrame(() => {
      buttonRefs.current.get(target.slot_id)?.focus();
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLUListElement>): void => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveFocus(1);
        return;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveFocus(-1);
        return;
      case "Home":
        e.preventDefault();
        if (selectableSlots[0]) onSelect(selectableSlots[0]);
        return;
      case "End":
        e.preventDefault();
        if (selectableSlots[selectableSlots.length - 1]) {
          onSelect(selectableSlots[selectableSlots.length - 1] as AvailableSlot);
        }
        return;
    }
  };

  return (
    <ul
      role="radiogroup"
      aria-label="Choose a time slot"
      data-testid={testId ?? "time-slot-grid"}
      onKeyDown={handleKey}
      className={cn("grid gap-2 sm:grid-cols-3 lg:grid-cols-4", className)}
    >
      {slots.map((slot) => {
        const fits = slot.is_available && slot.slot_remaining >= guestCount;
        const selected = selectedSlotId === slot.slot_id;
        const showLowBadge =
          fits && slot.slot_remaining > 0 && slot.slot_remaining <= LOW_REMAINING_THRESHOLD;
        // Roving tabindex: the selected tile is the tab stop; if none is
        // selected, the first selectable tile gets it.
        const isTabStop =
          fits && (selected || (!selectedSlotId && slot.slot_id === firstSelectableSlotId));
        return (
          <li key={slot.slot_id}>
            <button
              ref={(el) => {
                buttonRefs.current.set(slot.slot_id, el);
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={!fits}
              tabIndex={isTabStop ? 0 : -1}
              disabled={!fits}
              onClick={() => fits && onSelect(slot)}
              data-testid={`time-slot-${slot.start_time.replace(/:/g, "")}`}
              className={cn(
                "relative flex w-full flex-col items-start gap-1 rounded-lg border p-3 text-left",
                "transition-[background-color,border-color] outline-none",
                "duration-[var(--duration-small)]",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
                fits
                  ? selected
                    ? "border-brand-primary bg-brand-primary/10 text-foreground shadow-[0_0_0_1px_var(--brand-primary)]"
                    : "border-border-subtle bg-card hover:border-border hover:bg-surface text-foreground"
                  : "border-border-subtle bg-surface/40 text-foreground-subtle cursor-not-allowed",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                <Clock aria-hidden className="size-3.5" />
                {formatTime(slot.start_time)}
              </span>
              {fits ? (
                <span className="text-foreground-muted text-xs">
                  {slot.slot_remaining} {slot.slot_remaining === 1 ? "spot" : "spots"} left
                </span>
              ) : (
                <span className="text-foreground-subtle text-xs">Sold out</span>
              )}
              {showLowBadge ? (
                <Badge
                  variant="outline"
                  className="border-status-warning-border text-status-warning-foreground absolute top-2 right-2 px-1.5 py-0 text-[10px]"
                >
                  Low
                </Badge>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
