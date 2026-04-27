"use client";

import * as React from "react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/shared/otp-input";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { cn } from "@/lib/utils";

import { resendOtpAction } from "@/features/booking/actions/resend-otp";
import { verifyOtpAction } from "@/features/booking/actions/verify-otp";
import { ResendCountdown } from "@/features/booking/components/resend-countdown";

/**
 * OtpVerifyForm — orchestrator for /my-booking/verify.
 *
 * The page header above this form already carries the masked-email +
 * booking-ref reminder, so we don't repeat it here. Layout sequence:
 *   1. OTP grid (the only required input)
 *   2. Resend countdown (immediately below — that's where the user looks
 *      when they don't get the code)
 *   3. Submit button
 *   4. Form-level error if any
 *
 * Auto-submits when the 6th digit is entered, since the user has already
 * committed by tapping it.
 *
 * `bookingRef` is intentionally accepted but unused in markup — the
 * server reads the booking from the OTP-pending cookie. The prop stays
 * so the call-site spec remains explicit at the type boundary.
 */

export type OtpVerifyFormProps = Readonly<{
  bookingRef: string;
  className?: string;
  "data-testid"?: string;
}>;

const OTP_LENGTH = 6;

export function OtpVerifyForm({
  bookingRef: _bookingRef,
  className,
  "data-testid": testId,
}: OtpVerifyFormProps) {
  const t = useTranslations("guest.verify");
  const [code, setCode] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [isVerifying, startVerifyTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();

  const submit = React.useCallback(
    (otp: string): void => {
      setFormError(null);
      setFieldError(null);
      startVerifyTransition(async () => {
        const result = await verifyOtpAction({ otp_code: otp });
        // Success branch redirects — we only observe failures here.
        if (result.success) return; // unreachable in practice
        if (result.fields?.["otp_code"]) {
          setFieldError(result.fields["otp_code"]);
          setCode("");
          return;
        }
        if (result.fields?.["form"]) {
          setFormError(result.fields["form"]);
          setCode("");
          return;
        }
        if (result.error === "RATE_LIMITED") {
          toastError(result);
          return;
        }
        setFormError(t("errorGeneric"));
      });
    },
    [t],
  );

  const handleResend = async (): Promise<void> => {
    setFormError(null);
    setFieldError(null);
    setCode("");
    return new Promise<void>((resolve) => {
      startResendTransition(async () => {
        const result = await resendOtpAction();
        if (!result.success) {
          if (result.fields?.["form"]) {
            setFormError(result.fields["form"]);
          } else {
            toastError(result);
          }
          resolve();
          return;
        }
        toastSuccess(t("resendSentTitle"), {
          description: t("resendSentBody", { maskedEmail: result.data.masked_email }),
        });
        resolve();
      });
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === OTP_LENGTH) submit(code);
      }}
      data-testid={testId ?? "otp-verify-form"}
      className={cn("flex flex-col items-center gap-4", className)}
      noValidate
    >
      <OtpInput
        value={code}
        onChange={setCode}
        onComplete={submit}
        disabled={isVerifying}
        {...(fieldError ? { "aria-invalid": true } : {})}
        data-testid="otp-verify-input"
      />

      {fieldError ? (
        <p
          role="alert"
          className="text-status-danger-foreground -mt-1 text-sm"
          data-testid="otp-verify-field-error"
        >
          {fieldError}
        </p>
      ) : null}

      {/* Resend sits directly under the OTP grid — that's where the user
          looks when the code doesn't arrive. */}
      <ResendCountdown
        onResend={handleResend}
        isPending={isResending}
        data-testid="otp-verify-resend"
      />

      <Button
        type="submit"
        size="lg"
        disabled={code.length !== OTP_LENGTH || isVerifying}
        data-testid="otp-verify-submit"
        className="mt-1 w-full"
      >
        {isVerifying ? t("ctaSubmitting") : t("ctaSubmit")}
      </Button>

      {formError ? (
        <Alert
          variant="destructive"
          className="w-full text-left"
          data-testid="otp-verify-form-error"
        >
          <AlertTitle>{t("alertTitle")}</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
