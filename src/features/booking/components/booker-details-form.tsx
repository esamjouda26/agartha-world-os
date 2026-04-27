"use client";

import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const form = useForm<BookerDetailsInput>({
    resolver: zodResolver(bookerDetailsSchema),
    defaultValues,
    mode: "onBlur",
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
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="name"
                    placeholder="As it appears on your ID"
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
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
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+60 12 345 6789"
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
            <FormItem className="mt-5 flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  id="booker-accept-terms"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  data-testid="booker-accept-terms"
                  className="mt-0.5"
                />
              </FormControl>
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="booker-accept-terms"
                  className="text-foreground text-sm leading-snug font-normal"
                >
                  I accept the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-brand-primary underline-offset-2 hover:underline"
                  >
                    Terms &amp; Conditions
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-brand-primary underline-offset-2 hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </Label>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </form>
    </FormProvider>
  );
}
