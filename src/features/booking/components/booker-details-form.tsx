"use client";

import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import {
  bookerDetailsSchema,
  type BookerDetailsInput,
} from "@/features/booking/schemas/booking-wizard";

/**
 * BookerDetailsForm — name + email + phone + T&Cs.
 *
 * Spec: frontend_spec.md:3421-3423.
 *
 * Pure controlled form: the parent owns the values via `defaultValues` +
 * `onValidChange` (fires whenever the entire schema validates). The wizard
 * uses that signal to enable the "Continue" CTA on the Details step. Promo
 * code is NOT collected here — it has its own debounced live-validating
 * <PromoCodeInput> elsewhere on the step so price preview updates inline.
 */

export type BookerDetailsFormProps = Readonly<{
  defaultValues: BookerDetailsInput;
  /** Fires every render with the latest values + validity. */
  onChange: (values: BookerDetailsInput, isValid: boolean) => void;
  /** Optional bridge so the parent can imperatively trigger validation. */
  onSubmitRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  className?: string;
  "data-testid"?: string;
}>;

export function BookerDetailsForm({
  defaultValues,
  onChange,
  onSubmitRef,
  className,
  "data-testid": testId,
}: BookerDetailsFormProps) {
  const t = useTranslations("guest.book.details");
  const form = useForm<BookerDetailsInput>({
    resolver: zodResolver(bookerDetailsSchema),
    defaultValues,
    mode: "onChange",
  });

  // Bridge schema validity back to the wizard so the "Continue" CTA can
  // reflect form state without owning RHF. Per-field watches keep deps
  // stable for exhaustive-deps; getValues() snapshots inside the effect.
  const name = form.watch("booker_name");
  const email = form.watch("booker_email");
  const phone = form.watch("booker_phone");
  const accepted = form.watch("accept_terms");
  const isValid = form.formState.isValid;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  React.useEffect(() => {
    onChangeRef.current(form.getValues(), isValid);
  }, [name, email, phone, accepted, isValid, form]);

  // Allow the wizard to `await ref.current()` when "Continue" is pressed —
  // this triggers full RHF validation and surfaces all errors at once even
  // if the user never blurred a field.
  React.useEffect(() => {
    if (!onSubmitRef) return;
    onSubmitRef.current = async () => {
      const ok = await form.trigger();
      return ok;
    };
    return () => {
      onSubmitRef.current = null;
    };
  }, [form, onSubmitRef]);

  return (
    <FormProvider {...form}>
      <form
        // The form never submits — the wizard owns final submission via the
        // create-booking Server Action. We still wrap in <form> so RHF +
        // assistive tech treat the inputs as a coherent form group.
        onSubmit={(e) => e.preventDefault()}
        data-testid={testId ?? "booker-details-form"}
        className={className}
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="booker_name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t("nameLabel")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="name"
                    placeholder={t("namePlaceholder")}
                    data-testid="booker-name-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="booker_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("emailLabel")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder={t("emailPlaceholder")}
                    data-testid="booker-email-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="booker_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("phoneLabel")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder={t("phonePlaceholder")}
                    data-testid="booker-phone-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="accept_terms"
          render={({ field }) => (
            <FormItem className="mt-5">
              <label
                htmlFor="booker-accept-terms"
                className="border-border-subtle bg-surface/50 flex cursor-pointer gap-2.5 rounded-lg border p-3"
              >
                <FormControl>
                  <Checkbox
                    id="booker-accept-terms"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    data-testid="booker-accept-terms"
                    className="mt-0.5 shrink-0"
                  />
                </FormControl>
                <span className="text-foreground-muted text-[13px] leading-snug">
                  {t("acceptTermsLabel")}{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-brand-primary font-medium underline-offset-2 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("termsLinkText")}
                  </a>{" "}
                  {t("andConjunction")}{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-brand-primary font-medium underline-offset-2 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("privacyLinkText")}
                  </a>
                </span>
              </label>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </FormProvider>
  );
}
