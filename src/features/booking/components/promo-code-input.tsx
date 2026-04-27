"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Tag, XCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { validatePromoCodeAction } from "@/features/booking/actions/validate-promo-code";
import type { PromoFailureReason, PromoValidation } from "@/features/booking/types/wizard";

/**
 * PromoCodeInput — debounced, live-validating promo code field.
 *
 * Calls `validatePromoCodeAction` 300ms after the user stops typing. On
 * success, the parent's `onValidated` callback receives the full validation
 * result so the running total can update inline. On failure, the field
 * surfaces a localized reason. No toast on validation outcome (only on
 * transient network error) — the spec considers price-preview part of the
 * primary feedback channel.
 */

const PROMO_REASON_COPY: Record<PromoFailureReason, string> = {
  TIER_NOT_FOUND: "Pick a tier first.",
  PROMO_NOT_FOUND: "We don't recognize that code.",
  PROMO_INACTIVE: "That code isn't active right now.",
  PROMO_EXPIRED: "That code has expired.",
  PROMO_MAX_USES_REACHED: "That code has been claimed too many times.",
  PROMO_GROUP_TOO_SMALL: "Your group is too small for that code.",
  PROMO_TIER_MISMATCH: "That code doesn't apply to your tier.",
  PROMO_DAY_INVALID: "That code isn't valid on this date.",
  PROMO_TIME_INVALID: "That code isn't valid at this time.",
  PROMO_CAMPAIGN_INACTIVE: "The campaign for that code has ended.",
};

export type PromoCodeInputProps = Readonly<{
  tierId: string | null;
  slotDate: string | null; // YYYY-MM-DD
  slotStartTime: string | null; // HH:MM:SS
  adultCount: number;
  childCount: number;
  /** Fires whenever the latest validation completes — null clears the discount. */
  onValidated: (validation: PromoValidation | null) => void;
  className?: string;
  "data-testid"?: string;
}>;

const DEBOUNCE_MS = 300;

export function PromoCodeInput({
  tierId,
  slotDate,
  slotStartTime,
  adultCount,
  childCount,
  onValidated,
  className,
  "data-testid": testId,
}: PromoCodeInputProps) {
  const [code, setCode] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [validation, setValidation] = React.useState<PromoValidation | null>(null);
  const [networkError, setNetworkError] = React.useState<string | null>(null);
  const requestSeq = React.useRef(0);

  const onValidatedRef = React.useRef(onValidated);
  onValidatedRef.current = onValidated;

  React.useEffect(() => {
    if (!code.trim()) {
      setValidation(null);
      setNetworkError(null);
      onValidatedRef.current(null);
      return;
    }
    if (!tierId || !slotDate || !slotStartTime) return;
    const myReq = ++requestSeq.current;
    const timer = window.setTimeout(async () => {
      setPending(true);
      const result = await validatePromoCodeAction({
        p_promo_code: code.trim().toUpperCase(),
        p_tier_id: tierId,
        p_slot_date: slotDate,
        p_slot_start_time: slotStartTime,
        p_adult_count: adultCount,
        p_child_count: childCount,
      });
      // Race-condition guard — discard stale responses.
      if (myReq !== requestSeq.current) return;
      setPending(false);
      if (!result.success) {
        setValidation(null);
        if (result.error === "RATE_LIMITED") {
          setNetworkError("Too many tries — please slow down.");
        } else if (result.error === "VALIDATION_FAILED") {
          setNetworkError("That code looks malformed.");
        } else {
          setNetworkError("Couldn't validate the code right now. Try again in a moment.");
        }
        onValidatedRef.current(null);
        return;
      }
      setNetworkError(null);
      setValidation(result.data);
      onValidatedRef.current(result.data);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [code, tierId, slotDate, slotStartTime, adultCount, childCount]);

  const id = React.useId();
  const helperId = `${id}-helper`;
  const helperText = networkError
    ? networkError
    : validation
      ? validation.valid
        ? `Discount applied: ${validation.promo_code}`
        : (PROMO_REASON_COPY[validation.reason] ?? "That code can't be used here.")
      : "Have a code? Enter it for a discount.";
  const helperTone = networkError
    ? "text-status-danger-foreground"
    : validation && !validation.valid
      ? "text-status-danger-foreground"
      : validation?.valid
        ? "text-status-success-foreground"
        : "text-foreground-muted";

  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      data-testid={testId ?? "promo-code-input"}
    >
      <Label htmlFor={id} className="text-foreground text-sm font-medium">
        Promo code <span className="text-foreground-subtle font-normal">(optional)</span>
      </Label>
      <div className="relative">
        <span
          aria-hidden
          className="text-foreground-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        >
          <Tag className="size-4" />
        </span>
        <Input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          maxLength={40}
          aria-describedby={helperId}
          aria-invalid={validation && !validation.valid ? true : undefined}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. WELCOME10"
          className="pr-10 pl-9 uppercase"
          data-testid={testId ? `${testId}-field` : "promo-code-input-field"}
        />
        <span
          aria-hidden
          className="absolute top-1/2 right-3 -translate-y-1/2"
          data-testid={testId ? `${testId}-status-icon` : undefined}
        >
          {pending ? (
            <Loader2 className="text-foreground-muted size-4 animate-spin" />
          ) : validation?.valid ? (
            <CheckCircle2 className="text-status-success-foreground size-4" />
          ) : validation && !validation.valid ? (
            <XCircle className="text-status-danger-foreground size-4" />
          ) : null}
        </span>
      </div>
      <p id={helperId} className={cn("text-xs", helperTone)}>
        {helperText}
      </p>
    </div>
  );
}
