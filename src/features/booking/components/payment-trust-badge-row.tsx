import * as React from "react";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * PaymentTrustBadgeRow — single, honest reassurance line beneath the CTA.
 *
 * Earlier iterations tried three claims (Lock, Shield, Sparkles); two of
 * those repeated the same trust signal in different words. One precise
 * line carries more weight — and "make sense" beats "look reassured".
 */
export type PaymentTrustBadgeRowProps = Readonly<{
  /** Optional gateway name; defaults to a generic message. */
  gateway?: string | null;
  className?: string;
  "data-testid"?: string;
}>;

export function PaymentTrustBadgeRow({
  gateway,
  className,
  "data-testid": testId,
}: PaymentTrustBadgeRowProps) {
  return (
    <p
      data-testid={testId ?? "payment-trust-badge-row"}
      className={cn(
        "text-foreground-muted inline-flex items-center justify-center gap-2 text-xs",
        className,
      )}
    >
      <Lock aria-hidden className="text-status-success-foreground size-3.5" />
      <span>
        {gateway
          ? `Encrypted payment via ${gateway}`
          : "Encrypted payment · We never see your card details."}
      </span>
    </p>
  );
}
