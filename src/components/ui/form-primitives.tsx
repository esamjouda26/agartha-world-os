"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Controller,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ServerActionResult } from "@/lib/errors";

/**
 * Form primitives — prompt.md §2B-D.13.
 *
 * A minimal alternative to the default shadcn `form.tsx` that bakes in:
 *   - server-error ingestion via `useServerErrors(result)` so a Server
 *     Action's `ServerActionResult.fields` translates directly into field-
 *     level `<FormMessage>` content.
 *   - automatic `aria-invalid` + `aria-describedby` wiring.
 *   - `<FormSubmitButton>` that disables while RHF reports `isSubmitting` and
 *     renders a spinner.
 *
 * Callers wrap their form in `<FormProvider {...form}>` (from `react-hook-form`)
 * and compose these primitives inside it.
 */

type FormFieldContextValue = Readonly<{ name: string }>;

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

type FormItemContextValue = Readonly<{ id: string }>;

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

/** Type-safe wrapper around RHF `<Controller>`. */
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("flex flex-col gap-1.5", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function useFieldIds() {
  const field = React.useContext(FormFieldContext);
  const item = React.useContext(FormItemContext);
  if (!field) throw new Error("FormField primitives must be used inside <FormField>");
  if (!item) throw new Error("FormField primitives must be used inside <FormItem>");

  return {
    name: field.name,
    formItemId: `${item.id}-form-item`,
    formDescriptionId: `${item.id}-form-description`,
    formMessageId: `${item.id}-form-message`,
  };
}

export function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { name, formItemId } = useFieldIds();
  const { errors } = useFormState({ name });
  const hasError = Boolean(errors[name]);
  return (
    <Label
      data-slot="form-label"
      data-error={hasError || undefined}
      className={cn("data-[error=true]:text-status-danger-foreground", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

export function FormControl(props: React.ComponentProps<typeof Slot.Root>) {
  const { name, formItemId, formDescriptionId, formMessageId } = useFieldIds();
  const { errors } = useFormState({ name });
  const hasError = Boolean(errors[name]);
  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={hasError ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={hasError || undefined}
      {...props}
    />
  );
}

export function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFieldIds();
  return (
    <p
      id={formDescriptionId}
      data-slot="form-description"
      className={cn("text-foreground-muted text-xs", className)}
      {...props}
    />
  );
}

export function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { name, formMessageId } = useFieldIds();
  const { errors } = useFormState({ name });
  const errorMessage = errors[name]?.message;
  const body =
    typeof errorMessage === "string" && errorMessage.length > 0 ? errorMessage : children;
  if (!body) return null;

  return (
    <p
      id={formMessageId}
      role="alert"
      data-slot="form-message"
      className={cn("text-status-danger-foreground text-xs", className)}
      {...props}
    >
      {body}
    </p>
  );
}

/**
 * Ingest the `fields` map from a failed `ServerActionResult` and push each
 * entry into RHF's error state so `<FormMessage>` can render server errors
 * under the correct input.
 */
export function useServerErrors<TValues extends FieldValues>(
  result: ServerActionResult<unknown> | undefined,
): void {
  const { setError } = useFormContext<TValues>();
  React.useEffect(() => {
    if (!result || result.success || !result.fields) return;
    for (const [field, message] of Object.entries(result.fields)) {
      setError(field as FieldPath<TValues>, { type: "server", message });
    }
  }, [result, setError]);
}

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
