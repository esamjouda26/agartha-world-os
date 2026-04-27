import * as React from "react";

import { BookingQrCode } from "@/features/booking/components/booking-qr-code";

/**
 * BookingPrintLayout — print-only ticket.
 *
 * Hidden on screen (`hidden print:block`) and rendered when the user
 * triggers `window.print()` from <BookingActionShelf>. The screen UI is
 * complementary; the print layout is the gate's fallback when QR
 * scanning fails.
 *
 * Tested at A4 + Letter via DevTools "Emulate print" — the booking_ref
 * lockup, QR, and essentials line all fit above the fold on both.
 *
 * Per the prompt's NOTES: "Print stylesheets MANDATORY for
 * /my-booking/manage and the post-payment confirmation."
 */

export type BookingPrintLayoutProps = Readonly<{
  bookingRef: string;
  qrCodeRef: string;
  bookerName: string;
  experienceName: string;
  tierName: string;
  durationMinutes: number;
  /** Pre-formatted human-readable date label. */
  dateLabel: string;
  /** Pre-formatted human-readable time label. */
  timeLabel: string;
  adultCount: number;
  childCount: number;
  perks: readonly string[];
}>;

export function BookingPrintLayout({
  bookingRef,
  qrCodeRef,
  bookerName,
  experienceName,
  tierName,
  durationMinutes,
  dateLabel,
  timeLabel,
  adultCount,
  childCount,
  perks,
}: BookingPrintLayoutProps) {
  const guestSummary = `${adultCount} ${adultCount === 1 ? "adult" : "adults"}${
    childCount > 0 ? `, ${childCount} ${childCount === 1 ? "child" : "children"}` : ""
  }`;
  return (
    <div
      data-slot="booking-print-layout"
      // hidden on screen; revealed only in print media. The print stylesheet
      // utilities (`print:*`) come from Tailwind's media-query modifiers,
      // so we do not need a separate print.css file for this surface.
      className="hidden print:block print:p-8 print:font-sans"
      aria-hidden
    >
      <header className="border-b-2 border-black pb-4 print:border-black">
        <p className="text-xs font-medium tracking-[0.2em] text-black uppercase">
          AgarthaOS · Admission ticket
        </p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.18em] text-black">
          {bookingRef}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-[1fr_auto] gap-6">
        <dl className="text-sm leading-relaxed text-black">
          <div className="mb-3">
            <dt className="text-xs tracking-wider uppercase">Booker</dt>
            <dd className="text-base font-medium">{bookerName}</dd>
          </div>
          <div className="mb-3">
            <dt className="text-xs tracking-wider uppercase">Experience</dt>
            <dd className="text-base font-medium">
              {experienceName} — {tierName}
            </dd>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs tracking-wider uppercase">Date</dt>
              <dd className="text-base font-medium">{dateLabel}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wider uppercase">Entry time</dt>
              <dd className="text-base font-medium">
                {timeLabel} · {durationMinutes} min
              </dd>
            </div>
          </div>
          <div className="mb-3">
            <dt className="text-xs tracking-wider uppercase">Guests</dt>
            <dd className="text-base font-medium">{guestSummary}</dd>
          </div>
        </dl>
        <div className="bg-white p-2">
          <BookingQrCode value={qrCodeRef} size={200} className="text-black" />
        </div>
      </div>

      {perks.length > 0 ? (
        <section className="mt-6 border-t border-black pt-4 text-black">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase">What's included</p>
          <ul className="mt-2 list-disc pl-5 text-xs leading-relaxed">
            {perks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-8 border-t border-black pt-3 text-[10px] tracking-wider text-black uppercase">
        Show this ticket at the gate. The QR code or the reference above identifies your booking.
      </footer>
    </div>
  );
}
