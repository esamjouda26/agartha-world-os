"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  RotateCcw,
  Timer,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toastError } from "@/components/ui/toast-helpers";
import { fadeIn, motion, motionOrStill, usePrefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { PaymentTrustBadgeRow } from "@/features/booking/components/payment-trust-badge-row";
import { startPaymentAction } from "@/features/booking/actions/start-payment";

/**
 * PaymentStatusDisplay — 4-state hero panel for /book/payment.
 *
 * States are derived from `bookings.status` + `booking_payments.status`:
 *   - idle       — bookings.pending_payment & payments.pending → render CTA + trust row.
 *   - processing — payments.pending after CTA dispatched (no terminal state yet)
 *                  In Phase 9a this is a transient state during the action call;
 *                  Phase 9b (Edge Function) lands real polling here.
 *   - success    — bookings.confirmed & payments.success → checkmark + "View booking".
 *   - failure    — payments.failed → retry CTA, booking stays pending_payment.
 *   - expired    — bookings.cancelled (after pg_cron sweep at 15 min) → start-over CTA.
 */

export type PaymentStatusDisplayState = "idle" | "processing" | "success" | "failure" | "expired";

export type PaymentStatusDisplayProps = Readonly<{
  state: PaymentStatusDisplayState;
  bookingRef: string;
  totalLabel: string;
  bookerEmail?: string;
  /** Where to send the guest after a successful payment ("View booking"). */
  manageHref?: string;
  /** Where the start-over CTA lands when the booking expired. */
  startOverHref?: string;
  /**
   * Optional contextual chip rendered absolutely in the panel's top-right
   * corner. Used by `/book/payment` to surface the live <HoldCountdown>
   * inline with the panel rather than as a separate row above it.
   * Caller is responsible for rendering only when meaningful for the
   * current state.
   */
  headerSlot?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}>;

export function PaymentStatusDisplay({
  state,
  bookingRef,
  totalLabel,
  bookerEmail,
  manageHref,
  startOverHref,
  headerSlot,
  className,
  "data-testid": testId,
}: PaymentStatusDisplayProps) {
  const t = useTranslations("guest.payment");
  const reduced = usePrefersReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [pendingMessage, setPendingMessage] = React.useState<string | null>(null);

  const handleStart = (): void => {
    setPendingMessage(null);
    startTransition(async () => {
      const result = await startPaymentAction({ booking_ref: bookingRef });
      if (result.success) {
        // Hand off to Stripe Hosted Checkout. From the user's POV the
        // browser navigates away; on completion Stripe redirects them
        // back to /book/payment with `?session_id=` or `?cancelled=1`.
        window.location.assign(result.data.redirectUrl);
        return;
      }
      if (result.error === "DEPENDENCY_FAILED" || result.error === "CONFLICT") {
        setPendingMessage(result.fields?.["form"] ?? t("pendingFallback"));
        return;
      }
      toastError(result);
    });
  };

  return (
    <motion.section
      data-slot="payment-status-display"
      data-state={state}
      data-testid={testId ?? "payment-status-display"}
      {...motionOrStill(fadeIn({ duration: "small" }), reduced)}
      className={cn(
        "border-border-subtle bg-card relative flex flex-col items-center gap-6 rounded-2xl border p-6 text-center shadow-xs sm:p-10",
        className,
      )}
    >
      {headerSlot ? (
        <div
          data-testid="payment-status-display-header-slot"
          className="absolute top-3 right-3 z-10 sm:top-4 sm:right-4"
        >
          {headerSlot}
        </div>
      ) : null}

      {state === "idle" || state === "processing" ? (
        <>
          <span
            aria-hidden
            className="bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary inline-flex size-16 items-center justify-center rounded-2xl shadow-xs"
          >
            <CreditCard className="size-8" />
          </span>
          <div className="flex max-w-md flex-col gap-2">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              {t("headlineIdle")}
            </h2>
            <p className="text-foreground-muted text-sm leading-relaxed">{t("idleBody")}</p>
          </div>
          <Button
            type="button"
            size="xl"
            onClick={handleStart}
            disabled={isPending || state === "processing"}
            data-testid="payment-continue-cta"
            className="w-full max-w-sm"
          >
            {isPending || state === "processing" ? (
              <Loader2 aria-hidden className="size-5 animate-spin" />
            ) : null}
            {isPending || state === "processing"
              ? t("ctaConnecting")
              : t("ctaContinue", { total: totalLabel })}
          </Button>
          {pendingMessage ? (
            <Alert
              variant="info"
              className="w-full max-w-md text-left"
              data-testid="payment-pending-info"
            >
              <Timer aria-hidden className="size-4" />
              <AlertTitle>{t("pendingTitle")}</AlertTitle>
              <AlertDescription>{pendingMessage}</AlertDescription>
            </Alert>
          ) : null}
          <PaymentTrustBadgeRow />
        </>
      ) : null}

      {state === "success" ? (
        <>
          <span
            aria-hidden
            className="bg-status-success-soft text-status-success-foreground inline-flex size-16 items-center justify-center rounded-2xl shadow-xs"
          >
            <CheckCircle2 className="size-8" />
          </span>
          <div className="flex max-w-md flex-col gap-2">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              {t("headlineSuccess")}
            </h2>
            <p className="text-foreground-muted text-sm leading-relaxed">
              {t("successCopy", { ref: bookingRef })}
              {bookerEmail ? t("successEmail", { email: bookerEmail }) : ""}
            </p>
          </div>
          {manageHref ? (
            <Button asChild size="lg" data-testid="payment-success-cta" className="w-full max-w-sm">
              <Link href={manageHref as never}>
                {t("ctaViewBooking")}
                <ChevronRight aria-hidden className="size-4" />
              </Link>
            </Button>
          ) : null}
        </>
      ) : null}

      {state === "failure" ? (
        <>
          <span
            aria-hidden
            className="bg-status-danger-soft text-status-danger-foreground inline-flex size-16 items-center justify-center rounded-2xl shadow-xs"
          >
            <XCircle className="size-8" />
          </span>
          <div className="flex max-w-md flex-col gap-2">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              {t("headlineFailure")}
            </h2>
            <p className="text-foreground-muted text-sm leading-relaxed">{t("failureCopy")}</p>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={handleStart}
            disabled={isPending}
            data-testid="payment-retry-cta"
            className="w-full max-w-sm"
          >
            {isPending ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <RotateCcw aria-hidden className="size-4" />
            )}
            {isPending ? t("ctaConnecting") : t("ctaRetry")}
          </Button>
          {pendingMessage ? (
            <Alert variant="info" className="w-full max-w-md text-left">
              <Timer aria-hidden className="size-4" />
              <AlertTitle>{t("pendingTitle")}</AlertTitle>
              <AlertDescription>{pendingMessage}</AlertDescription>
            </Alert>
          ) : null}
          <PaymentTrustBadgeRow />
        </>
      ) : null}

      {state === "expired" ? (
        <>
          <span
            aria-hidden
            className="bg-status-warning-soft text-status-warning-foreground inline-flex size-16 items-center justify-center rounded-2xl shadow-xs"
          >
            <Timer className="size-8" />
          </span>
          <div className="flex max-w-md flex-col gap-2">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              {t("headlineExpired")}
            </h2>
            <p className="text-foreground-muted text-sm leading-relaxed">{t("expiredCopy")}</p>
          </div>
          {startOverHref ? (
            <Button asChild size="lg" data-testid="payment-restart-cta" className="w-full max-w-sm">
              <Link href={startOverHref as never}>{t("ctaStartOver")}</Link>
            </Button>
          ) : null}
        </>
      ) : null}
    </motion.section>
  );
}
