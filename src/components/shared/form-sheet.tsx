"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * FormSheet — the standard right-anchored create/edit panel.
 *
 * 400–500px sheet (`frontend_spec.md:29`) hosting a form with fixed
 * header + scrollable body + fixed footer (Cancel / Submit). Every
 * feature's "New device", "Edit shift type", "Add location" drawer
 * should compose this instead of rebuilding the Sheet chrome.
 *
 * Layout contract:
 *   - Header — `title` + optional `description`.
 *   - Body   — scrollable region hosting caller form (`children`).
 *   - Footer — Cancel + primary Submit. Extra buttons via `footerExtras`.
 *
 * Pattern C: caller owns the form (RHF context) and wires submit /
 * onOpenChange. The sheet itself only renders chrome + footer controls.
 *
 * For modal-style centered dialogs, use `<Dialog>` directly. For
 * destructive confirmations, use `<ConfirmDialog>`.
 */

export type FormSheetProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Form body — typically `<form onSubmit={…}>` wrapping fields. */
  children: React.ReactNode;
  /** Fires when the primary Submit button is pressed. */
  onSubmit?: () => void | Promise<void>;
  /** Form id — when set, Submit becomes `type="submit" form={formId}`. */
  formId?: string;
  submitLabel?: string;
  cancelLabel?: string;
  submitVariant?: React.ComponentProps<typeof Button>["variant"];
  submitDisabled?: boolean;
  pending?: boolean;
  /** Hide the footer altogether (rare — form with its own inline submit). */
  hideFooter?: boolean;
  /** Extra footer buttons rendered BEFORE Cancel. */
  footerExtras?: React.ReactNode;
  /** Sheet width — defaults to `md` (28rem). */
  width?: "sm" | "md" | "lg" | "xl";
  side?: "right" | "left";
  "data-testid"?: string;
}>;

const WIDTH: Record<NonNullable<FormSheetProps["width"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
};

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  formId,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  submitVariant = "default",
  submitDisabled = false,
  pending = false,
  hideFooter = false,
  footerExtras,
  width = "md",
  side = "right",
  "data-testid": testId,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        data-testid={testId}
        className={cn("flex h-full w-full flex-col gap-0 p-0", WIDTH[width])}
      >
        <SheetHeader className="border-border-subtle border-b">
          <SheetTitle className="text-foreground text-base font-semibold">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-foreground-muted text-sm">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <div data-slot="form-sheet-body" className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
        {!hideFooter ? (
          <SheetFooter className="border-border-subtle bg-card flex flex-row items-center justify-end gap-2 border-t p-3">
            {footerExtras}
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                data-testid={testId ? `${testId}-cancel` : undefined}
              >
                {cancelLabel}
              </Button>
            </SheetClose>
            <Button
              type={formId ? "submit" : "button"}
              {...(formId ? { form: formId } : {})}
              variant={submitVariant}
              disabled={submitDisabled || pending}
              onClick={formId ? undefined : () => void onSubmit?.()}
              data-testid={testId ? `${testId}-submit` : undefined}
            >
              {submitLabel}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
