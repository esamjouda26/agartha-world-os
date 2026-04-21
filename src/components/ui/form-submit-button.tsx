"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Submit button tuned for react-hook-form + server-action flows.
 *
 * - Disables automatically while RHF reports `isSubmitting`.
 * - `isPending` OR's an external transition flag (e.g., `useTransition()`).
 * - Shows a spinner + `pendingLabel` copy while busy.
 *
 * Rendered as a primitive (composes `<Button>`) so it can appear outside a
 * `<FormProvider>` as well — in that case RHF context is absent and only the
 * external `isPending` gate drives the busy state.
 */
type FormSubmitButtonOwnProps = Readonly<{
  pendingLabel?: string;
  /** External submission flag, e.g. from `useTransition`. OR'd with RHF's. */
  isPending?: boolean;
}>;

export type FormSubmitButtonProps = FormSubmitButtonOwnProps & React.ComponentProps<typeof Button>;

export function FormSubmitButton({
  children,
  pendingLabel = "Submitting…",
  isPending = false,
  disabled,
  className,
  ...props
}: FormSubmitButtonProps) {
  // useFormContext returns an empty-ish object (not null) when there's no
  // <FormProvider> up the tree, which means `formState` is `undefined` rather
  // than throwing. `useFormState()` would instead crash on the null context.
  const rhfContext = useFormContext();
  const rhfSubmitting = rhfContext?.formState?.isSubmitting ?? false;
  const busy = rhfSubmitting || isPending;
  return (
    <Button
      type="submit"
      data-slot="form-submit"
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonVariants({ variant: props.variant, size: props.size }), className)}
      {...props}
    >
      {busy ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
