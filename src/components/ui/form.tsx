"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import {
  Controller,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Form primitives — prompt.md §2B-D.13.
 *
 * App-wide form field scaffolding layered on top of `react-hook-form`. The
 * primitives bake in:
 *   - automatic `aria-invalid` + `aria-describedby` wiring.
 *   - app design-token styling (`text-status-danger-foreground`,
 *     `text-foreground-muted`) — not shadcn's generic `text-destructive`.
 *   - `role="alert"` on `<FormMessage>` so assistive tech announces server
 *     and client errors the moment they mount.
 *
 * Server-action ergonomics live in sibling modules so this file stays a pure
 * UI primitive:
 *   - `<FormSubmitButton>` → `@/components/ui/form-submit-button`
 *   - `useServerErrors(result)` → `@/hooks/use-server-errors`
 *
 * Callers wrap their form in `<FormProvider {...form}>` (from
 * `react-hook-form`) and compose these primitives inside it.
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
