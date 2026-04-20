"use client";

import { Clock, MapPin, Smartphone, StickyNote } from "lucide-react";
import { format, parseISO } from "date-fns";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TodayShift } from "@/features/attendance/types";

type Punch = TodayShift["punches"][number];

export type PunchDetailSheetProps = Readonly<{
  punch: Punch | null;
  open: boolean;
  onClose: () => void;
}>;

/**
 * Detail view for a single timecard punch. Opens when the user taps any
 * punch in the timeline. Surfaces the punch type, exact timestamp, source
 * (mobile / kiosk / manual), and the note the user left at the time.
 *
 * GPS coordinates + selfie preview are intentionally NOT rendered here
 * yet — `gps_coordinates` + `selfie_url` aren't projected by the
 * `getTodayShift` query (we only pull columns the Client leaf currently
 * consumes, per the no-`select('*')` rule). Wiring them in is a scope-
 * constrained follow-up once we agree on PII display rules (CLAUDE.md
 * §15 — biometrics are `restricted`; raw coords are `confidential`).
 */
export function PunchDetailSheet({ punch, open, onClose }: PunchDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
        data-testid="attendance-punch-detail-sheet"
      >
        <SheetHeader className="border-border-subtle border-b">
          <SheetTitle className="capitalize">
            {punch ? punch.punch_type.replace("_", " ") : "Punch"}
          </SheetTitle>
          <SheetDescription>
            {punch ? format(parseISO(punch.punch_time), "EEE, MMM d yyyy · p") : ""}
          </SheetDescription>
        </SheetHeader>
        {punch ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            <section className="grid grid-cols-2 gap-4 text-sm">
              <Meta
                icon={<Clock aria-hidden className="size-3.5" />}
                label="Time"
                value={format(parseISO(punch.punch_time), "p")}
              />
              <Meta
                icon={<Smartphone aria-hidden className="size-3.5" />}
                label="Source"
                value={punch.source}
              />
            </section>

            {punch.remark ? (
              <section className="bg-surface border-border-subtle flex flex-col gap-1 rounded-md border p-3">
                <p className="text-foreground-subtle inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
                  <StickyNote aria-hidden className="size-3.5" />
                  Note you left with this punch
                </p>
                <p className="text-foreground text-sm whitespace-pre-wrap">{punch.remark}</p>
              </section>
            ) : (
              <section className="bg-surface border-border-subtle text-foreground-muted flex flex-col gap-1 rounded-md border p-3 text-sm">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
                  <StickyNote aria-hidden className="size-3.5" />
                  No note attached
                </p>
                <p>You didn&apos;t leave a note at the time of this punch.</p>
              </section>
            )}

            <p className="text-foreground-subtle inline-flex items-center gap-2 text-xs">
              <MapPin aria-hidden className="size-3" />
              Location + selfie are stored server-side for HR review.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Meta({
  icon,
  label,
  value,
}: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-foreground-muted mt-0.5">{icon}</span>
      <div className="min-w-0">
        <dt className="text-foreground-subtle text-[11px] font-medium tracking-wide uppercase">
          {label}
        </dt>
        <dd className="text-foreground capitalize">{value}</dd>
      </div>
    </div>
  );
}
