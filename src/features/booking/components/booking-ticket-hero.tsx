"use client";

import * as React from "react";
import { Calendar, ChevronDown, Clock, Sparkles, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/ui/status-badge";
import {
  AnimatePresence,
  motion,
  motionOrStill,
  slideUp,
  usePrefersReducedMotion,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

import { BookingQrCode } from "@/features/booking/components/booking-qr-code";

/**
 * BookingTicketHero — the gate ticket.
 *
 * One unified card (no two-tone seam): QR in a white panel that bleeds
 * into the card's chrome via a single border, facts below on the
 * regular card surface. Action shelf and "What's included" disclosure
 * are part of the same card so the hero doesn't share air with three
 * outboard sections on mobile.
 */

export type BookingTicketHeroProps = Readonly<{
  bookingRef: string;
  qrCodeRef: string;
  status: Database["public"]["Enums"]["booking_status"];
  experienceName: string;
  tierName: string;
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
  adultCount: number;
  childCount: number;
  perks: readonly string[];
  checkedInAt?: string | null;
  /** Optional inline action row (Print + Add to calendar). */
  actionShelf?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}>;

export function BookingTicketHero({
  bookingRef,
  qrCodeRef,
  status,
  experienceName,
  tierName,
  dateLabel,
  timeLabel,
  durationMinutes,
  adultCount,
  childCount,
  perks,
  checkedInAt,
  actionShelf,
  className,
  "data-testid": testId,
}: BookingTicketHeroProps) {
  const t = useTranslations("guest.manage.ticketHero");
  const reduced = usePrefersReducedMotion();
  const [perksOpen, setPerksOpen] = React.useState(false);
  const guestSummary = `${t("guestSummaryAdults", { count: adultCount })}${
    childCount > 0 ? ` · ${t("guestSummaryChildren", { count: childCount })}` : ""
  }`;

  return (
    <section
      data-slot="booking-ticket-hero"
      data-testid={testId ?? "booking-ticket-hero"}
      aria-label={t("ariaLabel")}
      className={cn(
        "border-border-subtle bg-card relative flex flex-col overflow-hidden rounded-2xl border shadow-sm",
        className,
      )}
    >
      {/* Status pill — anchored top-right so it never fights the QR. */}
      <div className="absolute top-4 right-4 z-10">
        <StatusBadge
          status={status}
          enum="booking_status"
          variant="glass"
          label={t(`statusLabel.${status}`)}
          data-testid="booking-status-badge"
        />
      </div>

      {/* QR panel — white surface for camera readability; soft bottom
          border melts into the card body so the page doesn't feel like
          two stitched cards. */}
      <div className="border-border-subtle dark:border-border-subtle/50 border-b bg-white p-6 sm:p-8 dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <BookingQrCode
            value={qrCodeRef}
            size={240}
            aria-label={t("qrAria", { ref: bookingRef })}
            className="text-black"
          />
          <p
            className="mt-1 font-mono text-xl font-semibold tracking-[0.18em] text-black tabular-nums"
            data-testid="booking-ref-display"
          >
            {bookingRef}
          </p>
          <p className="text-center text-[11px] leading-snug text-neutral-500">{t("qrFooter")}</p>
        </div>
      </div>

      {/* Booking facts. */}
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <p className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
            {experienceName}
          </p>
          <p className="text-foreground mt-0.5 text-base font-semibold sm:text-lg">{tierName}</p>
        </div>

        <dl className="text-foreground grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <Calendar aria-hidden className="text-foreground-muted mt-0.5 size-4 shrink-0" />
            <div>
              <dt className="text-foreground-muted text-xs">{t("dateLabel")}</dt>
              <dd className="leading-tight font-medium">{dateLabel}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock aria-hidden className="text-foreground-muted mt-0.5 size-4 shrink-0" />
            <div>
              <dt className="text-foreground-muted text-xs">{t("entryLabel")}</dt>
              <dd className="leading-tight font-medium">
                {timeLabel}
                <span className="text-foreground-muted ml-1 text-xs font-normal">
                  · {t("durationSuffix", { minutes: durationMinutes })}
                </span>
              </dd>
            </div>
          </div>
          <div className="col-span-2 flex items-start gap-2 sm:col-span-1">
            <Users aria-hidden className="text-foreground-muted mt-0.5 size-4 shrink-0" />
            <div>
              <dt className="text-foreground-muted text-xs">{t("guestsLabel")}</dt>
              <dd className="leading-tight font-medium">{guestSummary}</dd>
            </div>
          </div>
        </dl>

        {checkedInAt ? (
          <div className="border-border-subtle bg-status-success-soft/30 text-status-success-foreground rounded-md border px-3 py-2 text-xs">
            {t("checkedInAt", { datetime: new Date(checkedInAt).toLocaleString("en-MY") })}
          </div>
        ) : null}

        {actionShelf ? (
          <div className="border-border-subtle border-t pt-3">{actionShelf}</div>
        ) : null}

        {perks.length > 0 ? (
          <div className="border-border-subtle border-t pt-2">
            <button
              type="button"
              onClick={() => setPerksOpen((v) => !v)}
              aria-expanded={perksOpen}
              aria-controls="ticket-perks"
              data-testid="ticket-perks-toggle"
              className="text-foreground-muted hover:text-foreground focus-visible:ring-ring -ml-2 inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
            >
              <Sparkles aria-hidden className="text-brand-primary size-4" />
              <span>{t("perksToggle", { count: perks.length })}</span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "ml-auto size-4 transition-transform duration-[var(--duration-small)]",
                  perksOpen && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {perksOpen ? (
                <motion.ul
                  id="ticket-perks"
                  {...motionOrStill(slideUp({ duration: "small" }), reduced)}
                  className="text-foreground-muted mt-2 flex flex-col gap-1.5 overflow-hidden px-2 pb-2 text-xs"
                >
                  {perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="text-brand-primary bg-brand-primary mt-1 inline-block size-1.5 shrink-0 rounded-full"
                      />
                      <span className="leading-snug">{perk}</span>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </section>
  );
}
