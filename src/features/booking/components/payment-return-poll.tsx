"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * PaymentReturnPoll — fallback poll while Stripe's webhook propagates.
 *
 * Mounted on /book/payment when the URL carries `?session_id=…` (Stripe
 * sent the user back from Hosted Checkout). The webhook → RPC commit →
 * cache invalidation chain is usually sub-second, but networks vary;
 * this component refreshes the RSC tree every 3s for the first 30s,
 * every 5s after that, and aborts at 90s with a manual-refresh CTA.
 *
 * No new data fetch happens here — `router.refresh()` re-pulls the
 * current page's RSC props. The page derives state from
 * `getBookingPaymentContext` which always reads the latest DB row, so
 * once the webhook commits the next refresh flips into success state
 * and this component unmounts (the parent stops rendering it).
 *
 * Realtime (B11) supersedes this for the primary path; this component
 * remains as graceful degradation when the Realtime connection fails.
 */

const FAST_INTERVAL_MS = 3000;
const SLOW_INTERVAL_MS = 5000;
const FAST_PHASE_MS = 30_000;
const TIMEOUT_MS = 90_000;

type Phase = "polling" | "timed_out";

export type PaymentReturnPollProps = Readonly<{
  className?: string;
  "data-testid"?: string;
}>;

export function PaymentReturnPoll({ className, "data-testid": testId }: PaymentReturnPollProps) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("polling");
  const startedAtRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    // Re-trigger refresh on visibility change (e.g., user tabbed away
    // and came back) so we don't waste polls in the background.
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed >= TIMEOUT_MS) {
        setPhase("timed_out");
        return;
      }
      router.refresh();
      const next = elapsed < FAST_PHASE_MS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
      timer = setTimeout(tick, next);
    };

    timer = setTimeout(tick, FAST_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return (
    <div
      data-slot="payment-return-poll"
      data-testid={testId ?? "payment-return-poll"}
      role="status"
      aria-live="polite"
      className={cn(
        "border-border-subtle bg-card flex flex-col items-center gap-3 rounded-xl border p-5 text-center",
        className,
      )}
    >
      {phase === "polling" ? (
        <>
          <Loader2 aria-hidden className="text-foreground-muted size-5 animate-spin" />
          <p className="text-foreground text-sm font-medium">Confirming your payment…</p>
          <p className="text-foreground-muted text-xs">
            This usually takes a few seconds. Please don't close this tab.
          </p>
        </>
      ) : (
        <>
          <p className="text-foreground text-sm font-medium">Taking longer than expected</p>
          <p className="text-foreground-muted text-xs">
            Your payment is still being processed. Refresh the page in a moment, or check "My
            booking" — we'll email your QR code as soon as it confirms.
          </p>
        </>
      )}
    </div>
  );
}
