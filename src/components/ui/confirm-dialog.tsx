"use client";

import * as React from "react";
import { AlertTriangle, Info, ShieldAlert, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * ConfirmDialog — standard destructive/confirm modal.
 *
 * Intent-typed wrapper over `<AlertDialog>`:
 *   - `destructive` — delete, deactivate, void (red confirm button).
 *   - `warning`     — unusual state changes (terminate leave, lock user).
 *   - `info`        — low-stakes confirmations (publish, send notifier).
 *
 * Supports a `reason` textarea for domains where the audit trail needs
 * operator rationale (reject reason, leave conversion note, override
 * justification). When `requireReason = true`, the confirm button is
 * disabled until the caller-supplied `validateReason` passes (defaults
 * to "non-empty trimmed").
 *
 * Fully controlled: caller owns `open` + `onOpenChange`. `onConfirm` is
 * awaitable so the primitive can disable actions during mutation.
 */

export type ConfirmDialogIntent = "destructive" | "warning" | "info";

const INTENT_META: Record<
  ConfirmDialogIntent,
  {
    Icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    mediaClass: string;
    confirmVariant: React.ComponentProps<typeof Button>["variant"];
  }
> = {
  destructive: {
    Icon: Trash2,
    iconClass: "text-status-danger-foreground",
    mediaClass: "bg-status-danger-soft",
    confirmVariant: "destructive",
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: "text-status-warning-foreground",
    mediaClass: "bg-status-warning-soft",
    confirmVariant: "default",
  },
  info: {
    Icon: Info,
    iconClass: "text-status-info-foreground",
    mediaClass: "bg-status-info-soft",
    confirmVariant: "default",
  },
};

export type ConfirmDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  intent?: ConfirmDialogIntent;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Override the default intent icon. */
  icon?: React.ReactNode;
  /** Render a labeled reason textarea between description and footer. */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** Returns `true` when the reason passes validation. */
  validateReason?: (reason: string) => boolean;
  onConfirm: (reason?: string) => void | Promise<void>;
  pending?: boolean;
  /** Optional additional content (warnings, affected counts). */
  children?: React.ReactNode;
  "data-testid"?: string;
}>;

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  intent = "info",
  confirmLabel,
  cancelLabel = "Cancel",
  icon,
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder,
  validateReason = (value) => value.trim().length > 0,
  onConfirm,
  pending = false,
  children,
  "data-testid": testId,
}: ConfirmDialogProps) {
  const meta = INTENT_META[intent];
  const Icon = meta.Icon;
  const reasonId = React.useId();
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const reasonValid = !requireReason || validateReason(reason);
  const canConfirm = reasonValid && !pending;

  const resolvedConfirmLabel =
    confirmLabel ??
    (intent === "destructive" ? "Delete" : intent === "warning" ? "Proceed" : "Confirm");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <AlertDialogMedia className={meta.mediaClass}>
            <span aria-hidden className={cn("inline-flex", meta.iconClass)}>
              {icon ?? <Icon className="size-7" />}
            </span>
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {children ? <div className="text-foreground-muted text-sm">{children}</div> : null}
        {requireReason ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId} className="text-xs">
              {reasonLabel}
            </Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={reasonPlaceholder}
              disabled={pending}
              aria-invalid={!reasonValid ? true : undefined}
              data-testid={testId ? `${testId}-reason` : undefined}
              rows={3}
            />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={pending}
            data-testid={testId ? `${testId}-cancel` : undefined}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={meta.confirmVariant}
            disabled={!canConfirm}
            onClick={(event) => {
              if (!canConfirm) {
                event.preventDefault();
                return;
              }
              event.preventDefault();
              void Promise.resolve(onConfirm(requireReason ? reason : undefined)).then(() => {
                // Caller closes the dialog via onOpenChange when appropriate.
              });
            }}
            data-testid={testId ? `${testId}-confirm` : undefined}
          >
            {resolvedConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Icon swap helper — exported for callers that want a non-default glyph. */
export const ConfirmDialogIcons = {
  Destructive: Trash2,
  Warning: AlertTriangle,
  Info,
  Shield: ShieldAlert,
} as const;
