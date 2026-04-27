"use client";

import * as React from "react";
import { CalendarPlus, Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/components/ui/toast-helpers";
import { cn } from "@/lib/utils";

import { buildBookingIcs, type BookingIcsInput } from "@/lib/ics/booking-ics";

/**
 * BookingActionShelf — calendar + print, both delivering real artifacts.
 *
 * "Email me again" / "Save to wallet" CTAs were intentionally omitted:
 * the user is already on this page from an OTP-verified email link, and
 * .pkpass / Google Wallet pass generation requires Session-18 backend
 * scaffolding. Buttons that wouldn't deliver an artifact would be UX noise.
 *
 * Both implementations are pure client-side:
 *   - .ics: built in-browser via `buildBookingIcs`, downloaded via
 *     a transient Blob URL. No server round-trip.
 *   - Print: triggers `window.print()` so the print stylesheet on the
 *     page takes over.
 */

export type BookingActionShelfProps = Readonly<{
  ics: BookingIcsInput;
  className?: string;
  "data-testid"?: string;
}>;

export function BookingActionShelf({
  ics,
  className,
  "data-testid": testId,
}: BookingActionShelfProps) {
  const t = useTranslations("guest.manage.actions");
  const handleAddToCalendar = React.useCallback((): void => {
    const content = buildBookingIcs(ics);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ics.bookingRef.toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Defer revoke so Safari has time to read the blob.
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    toastSuccess(t("calendarToastTitle"), {
      description: t("calendarToastBody"),
    });
  }, [ics, t]);

  const handlePrint = React.useCallback((): void => {
    window.print();
  }, []);

  return (
    <div
      data-slot="booking-action-shelf"
      data-testid={testId ?? "booking-action-shelf"}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddToCalendar}
        data-testid="booking-action-add-to-calendar"
      >
        <CalendarPlus aria-hidden className="size-4" />
        {t("addToCalendar")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePrint}
        data-testid="booking-action-print"
      >
        <Printer aria-hidden className="size-4" />
        {t("printTicket")}
      </Button>
    </div>
  );
}
