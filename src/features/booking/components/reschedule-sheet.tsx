"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toastSuccess } from "@/components/ui/toast-helpers";
import { cn } from "@/lib/utils";

import { getAvailableSlotsAction } from "@/features/booking/actions/get-available-slots";
import { rescheduleBookingAction } from "@/features/booking/actions/reschedule-booking";
import { TimeSlotGrid } from "@/features/booking/components/time-slot-grid";
import type { AvailableSlot } from "@/features/booking/types/wizard";

/**
 * RescheduleSheet — single-step Sheet that opens the reschedule flow.
 *
 * The user comes here rarely, with intent. Optimise for "show me slots,
 * pick one, commit" — no nested confirmation dialog (CLAUDE.md §5
 * forbids sheet-over-dialog for routine edits). The CTA label uses a
 * 2-line layout (heading + meta) so it never wraps awkwardly on a 360px
 * viewport — earlier single-line variants like
 * "Move to Tue, Jan 7, 2026 at 10:30 am" wrapped to three lines on
 * narrow phones.
 *
 * Date picker: the calendar is rendered INLINE inside the sheet (not
 * inside a popover trigger). Inside an already-open sheet, a
 * popover-on-popover is bad touch ergonomics — the user has the room,
 * just show the calendar. This also matches the wizard's date-step
 * pattern, so the user sees the same control twice in the product.
 *
 * RPC error codes are mapped server-side; the client just renders the
 * `result.fields["form"]` copy in an Alert when present.
 */

export type RescheduleSheetProps = Readonly<{
  experienceId: string;
  tierId: string;
  guestCount: number;
  /** YYYY-MM-DD of the current booking — used to disable the same-day shortcut. */
  currentSlotDate: string;
  /** UUID of the current slot — passed so we can disable it in the grid. */
  currentSlotId: string;
  /** Why the panel is shown — used for the trigger button copy. */
  triggerLabel?: string;
  className?: string;
  "data-testid"?: string;
}>;

const MAX_DAYS_AHEAD = 14;

function isoDateLocal(d: Date): string {
  const yyyy = d.getFullYear().toString().padStart(4, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDateLocal(iso: string | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function RescheduleSheet({
  experienceId,
  tierId,
  guestCount,
  currentSlotDate,
  currentSlotId,
  triggerLabel,
  className,
  "data-testid": testId,
}: RescheduleSheetProps) {
  const t = useTranslations("guest.manage.reschedule");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<string | null>(null);
  const [slotId, setSlotId] = React.useState<string | null>(null);
  const [slots, setSlots] = React.useState<readonly AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const resolvedTriggerLabel = triggerLabel ?? t("triggerDefault");

  // Reset state every time the sheet opens — prevents stale picks from
  // a previously-cancelled flow leaking into a new attempt.
  React.useEffect(() => {
    if (open) {
      setDate(null);
      setSlotId(null);
      setSlots([]);
      setSlotsError(null);
      setFormError(null);
    }
  }, [open]);

  // Fetch slots when the date changes (or guest count changes mid-flow).
  React.useEffect(() => {
    if (!date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    void (async () => {
      const result = await getAvailableSlotsAction({
        p_experience_id: experienceId,
        p_date: date,
        p_tier_id: tierId,
        p_guest_count: guestCount,
      });
      if (cancelled) return;
      setSlotsLoading(false);
      if (!result.success) {
        setSlots([]);
        setSlotsError(t("slotsErrorBody"));
        return;
      }
      setSlots(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [date, experienceId, tierId, guestCount, t]);

  const today = React.useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const maxDate = React.useMemo(() => {
    const max = new Date(today);
    max.setDate(max.getDate() + MAX_DAYS_AHEAD);
    return max;
  }, [today]);

  const selectedSlot = slots.find((s) => s.slot_id === slotId) ?? null;

  const handleSubmit = (): void => {
    if (!selectedSlot) return;
    setFormError(null);
    startTransition(async () => {
      const result = await rescheduleBookingAction({
        new_time_slot_id: selectedSlot.slot_id,
      });
      if (!result.success) {
        if (result.fields?.["form"]) {
          setFormError(result.fields["form"]);
        } else {
          setFormError(t("errorGeneric"));
        }
        return;
      }
      toastSuccess(t("successTitle"), {
        description: t("successCopy", {
          date: formatHumanDate(result.data.new_slot_date),
          time: formatHumanTime(result.data.new_start_time),
        }),
      });
      setOpen(false);
      // The booking row's time_slot_id changed server-side. revalidatePath
      // invalidates the Router Cache, but the React tree is still mounted
      // showing the prior date; refresh forces a fresh RSC render so the
      // ticket hero + summary line update without the user having to
      // navigate away.
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full sm:w-auto", className)}
          data-testid={testId ?? "reschedule-trigger"}
        >
          <CalendarDays aria-hidden className="size-4" />
          {resolvedTriggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-5 overflow-y-auto p-6 sm:max-w-md"
        data-testid="reschedule-sheet"
      >
        <SheetHeader className="gap-1.5 p-0">
          <SheetTitle className="text-foreground text-lg font-semibold tracking-tight">
            {t("title")}
          </SheetTitle>
          <SheetDescription className="text-foreground-muted text-sm">
            {t("subtitle")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2">
          <p className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
            {t("newDateLabel")}
          </p>
          {/* Inline calendar — matches the wizard's Date-step pattern.
              Disabled range: today through today + MAX_DAYS_AHEAD,
              mirroring scheduler_config.days_ahead. */}
          <Calendar
            mode="single"
            selected={parseIsoDateLocal(date) ?? undefined}
            onSelect={(d) => {
              setDate(d ? isoDateLocal(d) : null);
              setSlotId(null);
            }}
            disabled={(d: Date) => d < today || d > maxDate}
            initialFocus
            data-testid="reschedule-date-picker"
            className="self-center"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
            {t("newTimeLabel")}
          </p>
          {slotsError ? (
            <Alert variant="destructive">
              <AlertTitle>{t("slotsErrorTitle")}</AlertTitle>
              <AlertDescription>{slotsError}</AlertDescription>
            </Alert>
          ) : (
            <TimeSlotGrid
              slots={slots.filter((s) => s.slot_id !== currentSlotId || date !== currentSlotDate)}
              selectedSlotId={slotId}
              onSelect={(slot) => setSlotId(slot.slot_id)}
              loading={slotsLoading}
              guestCount={guestCount}
              data-testid="reschedule-slot-grid"
            />
          )}
        </div>

        {formError ? (
          <Alert variant="destructive" data-testid="reschedule-form-error">
            <AlertTitle>{t("alertTitle")}</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <SheetFooter className="border-border-subtle flex-col gap-2 border-t pt-4 sm:flex-col">
          {/* 2-line button label. The heading is the verb ("Move my
              booking"); the meta line is the new date+time. Stacking
              avoids the 360px wrap that earlier single-line copy hit. */}
          <Button
            type="button"
            size="lg"
            onClick={handleSubmit}
            disabled={!selectedSlot || isPending}
            data-testid="reschedule-confirm"
            className="h-auto w-full py-3"
          >
            {isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            {isPending ? (
              <span>{t("submitMoving")}</span>
            ) : selectedSlot && date ? (
              <span className="flex flex-col items-center gap-0.5 leading-tight">
                <span className="text-sm font-semibold">{t("submitHeading")}</span>
                <span className="text-xs font-normal opacity-90">
                  {t("submitMeta", {
                    date: formatHumanDateShort(date),
                    time: formatHumanTime(selectedSlot.start_time),
                  })}
                </span>
              </span>
            ) : (
              <span>{t("submitFallback")}</span>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="w-full"
          >
            {t("keepCurrent")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function formatHumanDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Compact date for the in-button meta line — no year, no comma cluster.
 * Stays readable on a 360px viewport even alongside the time portion.
 */
function formatHumanDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatHumanTime(hhmmss: string): string {
  const [hStr = "00", mStr = "00"] = hhmmss.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}
