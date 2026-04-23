"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * ApprovalStrip — inline approve/reject confirmation strip.
 *
 * Lighter than a full `<AlertDialog>` for cases where the confirmation
 * question is short and the reject path has no follow-up (no reason
 * textarea, no redirect). Used for IAM pending-user inline approval,
 * expense approval rows, simple leave conversions.
 *
 * Use `<ConfirmDialog>` for destructive actions, anything that needs a
 * reason, or any flow that opens a follow-up sheet. Use `<ApprovalStrip>`
 * only when the yes/no answer IS the entire decision.
 */

const approvalStripVariants = cva(
  "flex flex-col gap-3 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
  {
    variants: {
      tone: {
        info: "border-status-info-border bg-status-info-soft/40 text-status-info-foreground",
        warning:
          "border-status-warning-border bg-status-warning-soft/40 text-status-warning-foreground",
        danger:
          "border-status-danger-border bg-status-danger-soft/40 text-status-danger-foreground",
        neutral: "border-border-subtle bg-surface/60 text-foreground",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  },
);

export type ApprovalStripProps = Readonly<{
  /** Question / prompt text. */
  question: React.ReactNode;
  /** Optional supporting detail under the question. */
  description?: React.ReactNode;
  /** Primary action (approve). */
  onApprove: () => void | Promise<void>;
  approveLabel?: string;
  approveVariant?: React.ComponentProps<typeof Button>["variant"];
  /** Secondary action (reject) — when omitted, strip renders approve-only. */
  onReject?: () => void | Promise<void>;
  rejectLabel?: string;
  rejectVariant?: React.ComponentProps<typeof Button>["variant"];
  pending?: boolean;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}> &
  VariantProps<typeof approvalStripVariants>;

export function ApprovalStrip({
  question,
  description,
  onApprove,
  approveLabel = "Approve",
  approveVariant = "default",
  onReject,
  rejectLabel = "Reject",
  rejectVariant = "ghost",
  pending = false,
  disabled = false,
  tone = "info",
  className,
  "data-testid": testId,
}: ApprovalStripProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="false"
      data-slot="approval-strip"
      data-tone={tone}
      data-testid={testId}
      className={cn(approvalStripVariants({ tone }), className)}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-foreground text-sm font-medium">{question}</p>
        {description ? <p className="text-foreground-muted text-xs">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onReject ? (
          <Button
            type="button"
            variant={rejectVariant}
            size="sm"
            disabled={disabled || pending}
            onClick={() => void onReject()}
            data-testid={testId ? `${testId}-reject` : undefined}
          >
            {rejectLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={approveVariant}
          size="sm"
          disabled={disabled || pending}
          onClick={() => void onApprove()}
          data-testid={testId ? `${testId}-approve` : undefined}
        >
          {approveLabel}
        </Button>
      </div>
    </div>
  );
}
