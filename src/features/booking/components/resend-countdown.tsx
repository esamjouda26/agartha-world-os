"use client";

import * as React from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ResendCountdown — button that disables for `lockoutSeconds` after each
 * resend attempt to prevent spamming the OTP RPC.
 *
 * Default lockout is 60 seconds (Phase 9a Component Creation Contract).
 * The parent owns the resend Server Action call; this component only
 * enforces the cooldown UX.
 */

export type ResendCountdownProps = Readonly<{
  /** Async fn to invoke when the user clicks "Resend". */
  onResend: () => Promise<void>;
  lockoutSeconds?: number;
  /** When true, the parent's resend call is in flight — show a spinner. */
  isPending?: boolean;
  className?: string;
  "data-testid"?: string;
}>;

const DEFAULT_LOCKOUT = 60;

export function ResendCountdown({
  onResend,
  lockoutSeconds = DEFAULT_LOCKOUT,
  isPending = false,
  className,
  "data-testid": testId,
}: ResendCountdownProps) {
  const t = useTranslations("guest.verify");
  const [remaining, setRemaining] = React.useState(0);
  const startedAt = React.useRef<number | null>(null);
  const onResendRef = React.useRef(onResend);
  onResendRef.current = onResend;

  React.useEffect(() => {
    if (remaining <= 0) return;
    const interval = window.setInterval(() => {
      const start = startedAt.current ?? Date.now();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const next = Math.max(0, lockoutSeconds - elapsed);
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(interval);
        startedAt.current = null;
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [remaining, lockoutSeconds]);

  const handleClick = async (): Promise<void> => {
    if (remaining > 0 || isPending) return;
    startedAt.current = Date.now();
    setRemaining(lockoutSeconds);
    await onResendRef.current();
  };

  const disabled = remaining > 0 || isPending;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={() => void handleClick()}
      data-testid={testId ?? "resend-countdown"}
      className={cn("text-foreground-muted hover:text-foreground", className)}
      aria-live="polite"
    >
      {isPending ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        <RotateCcw aria-hidden className="size-4" />
      )}
      {remaining > 0
        ? t("resendCountdown", { label: formatRemaining(remaining, t) })
        : isPending
          ? t("resendSending")
          : t("resendCta")}
    </Button>
  );
}

type VerifyT = ReturnType<typeof useTranslations<"guest.verify">>;

function formatRemaining(seconds: number, t: VerifyT): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0
    ? t("resendCountdownLabelMinutes", { minutes: m, seconds: s.toString().padStart(2, "0") })
    : t("resendCountdownLabelSeconds", { seconds: s });
}
