import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/ui/empty-state";

import {
  BookingSummaryCard,
  type BookingSummaryLineItem,
} from "@/components/shared/booking-summary-card";

import { BookingPrintLayout } from "@/features/booking/components/booking-print-layout";
import { HoldCountdown } from "@/features/booking/components/hold-countdown";
import { PaymentReturnPoll } from "@/features/booking/components/payment-return-poll";
import {
  PaymentStatusDisplay,
  type PaymentStatusDisplayState,
} from "@/features/booking/components/payment-status-display";
import {
  getBookingPaymentContext,
  type BookingPaymentContext,
} from "@/features/booking/queries/get-booking-payment-context";
import { GUEST_BOOKING_REF_COOKIE } from "@/features/booking/constants";

/**
 * /book/payment — payment-processing landing for the freshly-created
 * booking. Cookie-bound (`guest_booking_ref`) for IDOR safety.
 *
 * Layout intent:
 *   - Mobile: summary FIRST (the user just made a price commitment;
 *     keeping the breakdown on top reduces "what am I paying for?"
 *     anxiety), status panel below.
 *   - Desktop: status panel left, summary aside right (sticky).
 *
 * The line items mirror what the wizard showed on /book Review so the
 * user sees the exact same breakdown — no surprises at the gateway.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.payment");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BookPaymentPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const urlRefRaw = typeof params.ref === "string" ? params.ref : null;
  const urlRef = urlRefRaw ? urlRefRaw.toUpperCase() : null;
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;
  const cancelled = params.cancelled === "1";

  const store = await cookies();
  const cookieRef = store.get(GUEST_BOOKING_REF_COOKIE)?.value?.toUpperCase() ?? null;

  if (!cookieRef) redirect("/my-booking" as never);
  if (urlRef && urlRef !== cookieRef) redirect("/my-booking" as never);

  const context = await getBookingPaymentContext(cookieRef);
  const t = await getTranslations("guest.payment");
  if (!context) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
        <EmptyState
          variant="error"
          title={t("notFoundTitle")}
          description={t("notFoundBody")}
          data-testid="book-payment-not-found"
        />
      </div>
    );
  }

  const state = derivePaymentState(context);
  // The user just returned from Stripe and the webhook hasn't landed
  // yet — show the polling component while we wait.
  const showPolling = Boolean(sessionId) && state === "idle";
  // Stripe cancelled-redirect: explicit failure UX even without a webhook.
  const renderState: PaymentStatusDisplayState = cancelled && state === "idle" ? "failure" : state;
  const totalAmount = context.payment?.amount ?? context.booking.total_price;
  const currency = context.payment?.currency ?? "MYR";
  const totalLabel = formatCurrency(totalAmount, currency);
  const lineItems = buildLineItems(context);

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-12 sm:px-6 lg:flex-row lg:items-start lg:gap-10"
      data-testid="book-payment-shell"
    >
      <header className="lg:hidden">
        <p className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
          {t("bookingLabel")} · <span className="font-mono">{context.booking.booking_ref}</span>
        </p>
        <h1 className="text-foreground mt-1 text-2xl font-semibold tracking-tight">
          {headlineFor(renderState, t)}
        </h1>
      </header>

      {/* Summary first on mobile (order-1); aside-positioned on lg+ */}
      <div className="lg:sticky lg:top-24 lg:order-2 lg:w-[22rem] lg:shrink-0">
        <BookingSummaryCard
          experienceName={context.experience.name}
          tierName={context.tier.name}
          date={formatHumanDate(context.slot.slot_date)}
          startTime={formatHumanTime(context.slot.start_time)}
          adultCount={context.booking.adult_count}
          childCount={context.booking.child_count}
          lineItems={lineItems}
          total={totalAmount}
          currency={currency}
          data-testid="payment-summary-aside"
        />
      </div>

      <div className="flex-1 lg:order-1 lg:max-w-2xl xl:max-w-3xl">
        <header className="mb-6 hidden flex-col gap-2 lg:flex">
          <p className="text-foreground-muted text-xs font-medium tracking-wide uppercase">
            {t("bookingLabel")} · <span className="font-mono">{context.booking.booking_ref}</span>
          </p>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
            {headlineFor(renderState, t)}
          </h1>
        </header>

        {/* Live hold countdown lives inside the status panel (top-right)
            instead of as a separate row above it — saves a card-worth of
            vertical space on small viewports while keeping the chip
            visually adjacent to the headline it qualifies. */}
        <PaymentStatusDisplay
          state={renderState}
          bookingRef={context.booking.booking_ref}
          totalLabel={totalLabel}
          {...(context.booking.booker_email ? { bookerEmail: context.booking.booker_email } : {})}
          manageHref="/my-booking/manage"
          startOverHref="/book"
          headerSlot={
            renderState === "idle" || renderState === "failure" ? (
              <HoldCountdown createdAt={context.booking.created_at} />
            ) : null
          }
        />

        {showPolling ? <PaymentReturnPoll className="mt-4" /> : null}
      </div>

      {/* Print-only ticket layout — only meaningful once the booking is
          confirmed. Browser-screen view is unaffected (`hidden print:block`). */}
      {renderState === "success" && context.booking.qr_code_ref ? (
        <BookingPrintLayout
          bookingRef={context.booking.booking_ref}
          qrCodeRef={context.booking.qr_code_ref}
          bookerName={context.booking.booker_name}
          experienceName={context.experience.name}
          tierName={context.tier.name}
          durationMinutes={context.tier.duration_minutes}
          dateLabel={formatHumanDate(context.slot.slot_date)}
          timeLabel={formatHumanTime(context.slot.start_time)}
          adultCount={context.booking.adult_count}
          childCount={context.booking.child_count}
          perks={[]}
        />
      ) : null}
    </div>
  );
}

function headlineFor(state: PaymentStatusDisplayState, t: (key: string) => string): string {
  switch (state) {
    case "success":
      return t("headlineSuccess");
    case "failure":
      return t("headlineFailure");
    case "expired":
      return t("headlineExpired");
    case "processing":
      return t("headlineProcessing");
    case "idle":
    default:
      return t("headlineIdle");
  }
}

function buildLineItems(ctx: BookingPaymentContext): readonly BookingSummaryLineItem[] {
  const items: BookingSummaryLineItem[] = [];
  const adultsAmt = ctx.tier.adult_price * ctx.booking.adult_count;
  const childrenAmt = ctx.tier.child_price * ctx.booking.child_count;
  if (ctx.booking.adult_count > 0) {
    items.push({
      label: `${ctx.tier.name} × ${ctx.booking.adult_count} ${
        ctx.booking.adult_count === 1 ? "adult" : "adults"
      }`,
      amount: adultsAmt,
    });
  }
  if (ctx.booking.child_count > 0) {
    items.push({
      label: `${ctx.tier.name} × ${ctx.booking.child_count} ${
        ctx.booking.child_count === 1 ? "child" : "children"
      }`,
      amount: childrenAmt,
    });
  }
  // Promo / discount: anything between gross and total_price is the discount,
  // surfaced as a single line so the user sees the saving.
  const gross = adultsAmt + childrenAmt;
  const discount = gross - ctx.booking.total_price;
  if (discount > 0) {
    items.push({
      label: "Promo discount",
      amount: -discount,
      hint: "Applied at booking",
    });
  }
  return items;
}

function derivePaymentState(ctx: BookingPaymentContext): PaymentStatusDisplayState {
  if (ctx.booking.status === "cancelled") return "expired";
  if (ctx.booking.status === "confirmed" || ctx.payment?.status === "success") return "success";
  if (ctx.payment?.status === "failed") return "failure";
  return "idle";
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
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

function formatHumanTime(hhmmss: string): string {
  const [hStr = "00", mStr = "00"] = hhmmss.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}
