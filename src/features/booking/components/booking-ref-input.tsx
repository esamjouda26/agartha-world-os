"use client";

import * as React from "react";
import { useTransition } from "react";
import { ArrowRight, HelpCircle, KeyRound, Loader2 } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastError } from "@/components/ui/toast-helpers";
import { useServerErrors } from "@/hooks/use-server-errors";
import { cn } from "@/lib/utils";
import type { ServerActionResult } from "@/lib/errors";

import { getBookingIdentityAction } from "@/features/booking/actions/get-booking-identity";
import {
  bookingLookupSchema,
  type BookingLookupInput,
} from "@/features/booking/schemas/booking-lookup";

/**
 * BookingRefInput — single-field form for /my-booking.
 *
 * Auto-formats the input as the user types: `agabc1231234` becomes
 * `AG-ABC123-1234`. Reduces validation errors and matches the visual
 * pattern from the confirmation email.
 *
 * On submit, dispatches getBookingIdentityAction. The success path
 * redirects (NEXT_REDIRECT throws), so we only observe the failure
 * branch here.
 *
 * The `<ServerErrorBridge>` is mounted inside the FormProvider so the
 * `useServerErrors` hook can call form.setError without prop-drilling.
 */

/**
 * Strip non-alphanumeric, uppercase, then re-insert separators at the
 * canonical positions: `AG-XXXXXX-NNNN`. Tolerates partial input so the
 * field stays readable while typing.
 */
function formatBookingRef(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Drop a leading "AG" prefix if present so the user can paste either
  // "AG-ABC123-1234" or just "ABC1231234"; we'll re-add the prefix.
  const body = cleaned.startsWith("AG") ? cleaned.slice(2) : cleaned;
  // 6 hex chars then 4 digits.
  const hex = body.slice(0, 6);
  const num = body.slice(6, 10);
  let out = "AG";
  if (hex.length > 0) out += `-${hex}`;
  if (num.length > 0) out += `-${num}`;
  return out;
}

export type BookingRefInputProps = Readonly<{
  defaultValue?: string;
  className?: string;
  "data-testid"?: string;
}>;

export function BookingRefInput({
  defaultValue,
  className,
  "data-testid": testId,
}: BookingRefInputProps) {
  const t = useTranslations("guest.lookup");
  const [serverResult, setServerResult] = React.useState<ServerActionResult<unknown> | undefined>();
  const [isPending, startTransition] = useTransition();
  const [helpOpen, setHelpOpen] = React.useState(false);

  const form = useForm<BookingLookupInput>({
    resolver: zodResolver(bookingLookupSchema),
    defaultValues: { booking_ref: defaultValue?.toUpperCase() ?? "" },
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await getBookingIdentityAction(values);
      setServerResult(result);
      if (!result.success && (result.error === "RATE_LIMITED" || result.error === "INTERNAL")) {
        toastError(result);
      }
    });
  });

  return (
    <FormProvider {...form}>
      <ServerErrorBridge serverResult={serverResult} />
      <form
        onSubmit={onSubmit}
        data-testid={testId ?? "booking-ref-input"}
        className={cn("flex flex-col gap-4", className)}
        noValidate
      >
        <FormField
          control={form.control}
          name="booking_ref"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-baseline justify-between gap-2">
                <FormLabel>{t("refLabel")}</FormLabel>
                <button
                  type="button"
                  onClick={() => setHelpOpen((v) => !v)}
                  aria-expanded={helpOpen}
                  aria-controls="booking-ref-help"
                  className="text-foreground-muted hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
                  data-testid="booking-ref-help-toggle"
                >
                  <HelpCircle aria-hidden className="size-3.5" />
                  {t("helpToggle")}
                </button>
              </div>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  maxLength={14}
                  placeholder={t("refPlaceholder")}
                  className="h-14 text-center font-mono text-lg tracking-[0.18em] uppercase"
                  data-testid="booking-ref-field"
                  onChange={(e) => field.onChange(formatBookingRef(e.target.value))}
                />
              </FormControl>
              <FormMessage />
              {helpOpen ? (
                <p
                  id="booking-ref-help"
                  className="text-foreground-muted bg-surface border-border-subtle mt-1 rounded-md border px-3 py-2 text-xs leading-relaxed"
                  data-testid="booking-ref-help-body"
                >
                  {t.rich("helpBody", {
                    a: (chunks) => (
                      <a
                        href="mailto:hello@agartha.example"
                        className="text-foreground-muted hover:text-foreground underline-offset-2 hover:underline"
                      >
                        {chunks}
                      </a>
                    ),
                  })}
                </p>
              ) : null}
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          data-testid="booking-ref-submit"
          className="w-full"
        >
          {isPending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <KeyRound aria-hidden className="size-4" />
          )}
          {isPending ? t("ctaSubmitting") : t("ctaSubmit")}
          {!isPending ? <ArrowRight aria-hidden className="size-4" /> : null}
        </Button>
        <p className="text-foreground-muted text-center text-xs">{t("footnote")}</p>
      </form>
    </FormProvider>
  );
}

function ServerErrorBridge({
  serverResult,
}: Readonly<{ serverResult: ServerActionResult<unknown> | undefined }>) {
  useServerErrors<BookingLookupInput>(serverResult);
  return null;
}
