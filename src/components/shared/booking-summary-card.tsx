import * as React from "react";
import { Calendar, Clock, ReceiptText, Tag, Users } from "lucide-react";

import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * BookingSummaryCard — line-item pricing + running total for the public
 * booking flow.
 *
 * Used by:
 *   - /book           — sticky aside on desktop, sticky-top accordion on mobile
 *   - /book/payment   — left/right of the gateway widget
 *   - /my-booking/manage — confirmation card after pay
 *
 * Pure presentational sink (CLAUDE.md §3 — Universal Pattern C). No data
 * fetching here; all values are computed by the parent and passed in.
 *
 * RSC-safe — this component remains a server component. All labels are
 * passed in via the `labels` prop by the parent (which calls
 * getTranslations on the server or useTranslations on the client).
 */

export type BookingSummaryLineItem = Readonly<{
  label: string;
  amount: number; // signed numeric — negative for discounts
  hint?: string;
}>;

/** Translated labels — passed in from the parent to keep this an RSC. */
export type BookingSummaryLabels = Readonly<{
  orderSummary: string;
  experience: string;
  tier: string;
  date: string;
  time: string;
  guests: string;
  total: string;
  appliedPromo: string;
  adultSingular: string;
  adultPlural: string;
  childSingular: string;
  childPlural: string;
}>;

export type BookingSummaryCardProps = Readonly<{
  experienceName?: string | null;
  tierName?: string | null;
  date?: string | null; // formatted human-readable (e.g. "Tue, May 5")
  startTime?: string | null; // formatted human-readable (e.g. "10:30 am")
  adultCount: number;
  childCount: number;
  /** Line items in display order — typically [tier × adults, tier × children, promo discount?]. */
  lineItems: readonly BookingSummaryLineItem[];
  total: number;
  currency?: string;
  promoCode?: string | null;
  /** Translated labels — required. Keeps component RSC-safe. */
  labels: BookingSummaryLabels;
  className?: string;
  "data-testid"?: string;
}>;

export function BookingSummaryCard({
  experienceName,
  tierName,
  date,
  startTime,
  adultCount,
  childCount,
  lineItems,
  total,
  currency = "MYR",
  promoCode,
  labels,
  className,
  "data-testid": testId,
}: BookingSummaryCardProps) {
  const totalGuests = adultCount + childCount;

  const adultLabel = adultCount === 1 ? labels.adultSingular : labels.adultPlural;
  const childLabel = childCount === 1 ? labels.childSingular : labels.childPlural;

  return (
    <aside
      data-slot="booking-summary-card"
      data-testid={testId ?? "booking-summary-card"}
      className={cn(
        "border-border-subtle bg-card text-foreground flex flex-col gap-4 rounded-xl border p-5 shadow-xs",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ReceiptText aria-hidden className="size-4" />
          {labels.orderSummary}
        </h2>
      </header>

      {/* Booking detail grid — only renders the fields we actually have. */}
      {(experienceName || tierName || date || startTime || totalGuests > 0) && (
        <dl
          className="text-foreground-muted grid gap-3 text-sm"
          data-testid="booking-summary-detail-list"
        >
          {experienceName ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-foreground-muted">{labels.experience}</dt>
              <dd className="text-foreground text-right font-medium">{experienceName}</dd>
            </div>
          ) : null}
          {tierName ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-foreground-muted flex items-center gap-1.5">
                <Tag aria-hidden className="size-3.5" />
                {labels.tier}
              </dt>
              <dd className="text-foreground text-right font-medium">{tierName}</dd>
            </div>
          ) : null}
          {date ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-foreground-muted flex items-center gap-1.5">
                <Calendar aria-hidden className="size-3.5" />
                {labels.date}
              </dt>
              <dd className="text-foreground text-right font-medium">{date}</dd>
            </div>
          ) : null}
          {startTime ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-foreground-muted flex items-center gap-1.5">
                <Clock aria-hidden className="size-3.5" />
                {labels.time}
              </dt>
              <dd className="text-foreground text-right font-medium">{startTime}</dd>
            </div>
          ) : null}
          {totalGuests > 0 ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-foreground-muted flex items-center gap-1.5">
                <Users aria-hidden className="size-3.5" />
                {labels.guests}
              </dt>
              <dd className="text-foreground text-right font-medium">
                {adultLabel}
                {childCount > 0 ? `, ${childLabel}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      )}

      {lineItems.length > 0 ? (
        <>
          <hr aria-hidden className="border-border-subtle" />
          <ul className="flex flex-col gap-2 text-sm" data-testid="booking-summary-line-items">
            {lineItems.map((item, idx) => (
              <li key={idx} className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      item.amount < 0 ? "text-status-success-foreground" : "text-foreground-muted",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.hint ? (
                    <span className="text-foreground-subtle text-xs">{item.hint}</span>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "tabular-nums",
                    item.amount < 0 ? "text-status-success-foreground" : "text-foreground",
                  )}
                >
                  {item.amount < 0 ? "−" : ""}
                  {formatMoney(Math.abs(item.amount), currency)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <hr aria-hidden className="border-border-subtle" />
      <div className="flex items-baseline justify-between">
        <span className="text-foreground text-sm font-semibold">{labels.total}</span>
        <span
          className="text-foreground text-lg font-semibold tabular-nums"
          data-testid="booking-summary-total"
          aria-live="polite"
        >
          {formatMoney(total, currency)}
        </span>
      </div>
      {promoCode ? (
        <p className="text-foreground-muted text-xs">
          {labels.appliedPromo} <span className="text-foreground font-medium">{promoCode}</span>
        </p>
      ) : null}
    </aside>
  );
}
