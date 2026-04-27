"use client";

import * as React from "react";
import { Timer } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * HoldCountdown — live ticker showing how long the slot hold has left.
 *
 * Spec: WF-7A line 697 — pg_cron `cancel-expired-pending-payments` runs
 * every 15 min and cancels any `pending_payment` booking older than 15
 * minutes. We surface that interval as a literal countdown so guests
 * know what "your slot is held" actually means.
 *
 * The component renders nothing once it expires — the page's status
 * derivation will already show the "expired" UI.
 */

export type HoldCountdownProps = Readonly<{
  /** ISO timestamp of when the booking was created. */
  createdAt: string;
  /** Hold duration in minutes. Defaults to 15 (matches the abandonment cron). */
  durationMinutes?: number;
  className?: string;
  "data-testid"?: string;
}>;

const DEFAULT_HOLD_MINUTES = 15;

export function HoldCountdown({
  createdAt,
  durationMinutes = DEFAULT_HOLD_MINUTES,
  className,
  "data-testid": testId,
}: HoldCountdownProps) {
  const t = useTranslations("guest.payment");
  const expiresAt = React.useMemo(
    () => new Date(createdAt).getTime() + durationMinutes * 60 * 1000,
    [createdAt, durationMinutes],
  );

  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) return null;

  const totalSec = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const urgent = remainingMs <= 60 * 1000 * 2;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId ?? "hold-countdown"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tabular-nums",
        urgent
          ? "bg-status-warning-soft border-status-warning-border text-status-warning-foreground"
          : "bg-surface border-border-subtle text-foreground-muted",
        className,
      )}
    >
      <Timer aria-hidden className="size-3.5" />
      <span>{t("holdCountdown", { minutes, seconds: seconds.toString().padStart(2, "0") })}</span>
    </div>
  );
}
