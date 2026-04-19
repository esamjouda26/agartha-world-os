import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * StatusBadge — canonical CVA primitive for every enum status indicator
 * across all portals (frontend_spec.md §12s / 4841–4879). Every domain
 * surface MUST render status via this component; inline badges with hand-
 * picked colors are forbidden.
 *
 * The full enum → tone mapping lives in `STATUS_TONE_MAP` below and is typed,
 * so TypeScript will surface a compile error the moment a new enum value is
 * added to the DB without a tone assignment.
 */

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap tabular-nums",
  {
    variants: {
      tone: {
        success:
          "bg-status-success-soft text-status-success-foreground border-status-success-border",
        warning:
          "bg-status-warning-soft text-status-warning-foreground border-status-warning-border",
        danger: "bg-status-danger-soft text-status-danger-foreground border-status-danger-border",
        info: "bg-status-info-soft text-status-info-foreground border-status-info-border",
        neutral:
          "bg-status-neutral-soft text-status-neutral-foreground border-status-neutral-border",
        accent: "bg-status-accent-soft text-status-accent-foreground border-status-accent-border",
      },
      variant: {
        default: "",
        outline: "bg-transparent",
        dot: "border-transparent bg-transparent px-0 py-0 capitalize",
      },
    },
    compoundVariants: [
      { variant: "outline", tone: "success", className: "border-status-success-border" },
      { variant: "outline", tone: "warning", className: "border-status-warning-border" },
      { variant: "outline", tone: "danger", className: "border-status-danger-border" },
      { variant: "outline", tone: "info", className: "border-status-info-border" },
      { variant: "outline", tone: "neutral", className: "border-status-neutral-border" },
      { variant: "outline", tone: "accent", className: "border-status-accent-border" },
    ],
    defaultVariants: {
      tone: "neutral",
      variant: "default",
    },
  },
);

const dotVariants = cva("inline-block size-2 rounded-full", {
  variants: {
    tone: {
      success: "bg-status-success-solid",
      warning: "bg-status-warning-solid",
      danger: "bg-status-danger-solid",
      info: "bg-status-info-solid",
      neutral: "bg-status-neutral-solid",
      accent: "bg-status-accent-solid",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;
export type StatusVariant = NonNullable<VariantProps<typeof statusBadgeVariants>["variant"]>;

/**
 * Enums StatusBadge accepts. Names mirror Postgres enum types in the
 * migrations so downstream `status: Database["public"]["Enums"][T]` props
 * line up 1:1 with a tone map entry.
 */
export type StatusEnum =
  | "booking_status"
  | "order_status"
  | "payment_status"
  | "incident_status"
  | "mo_status"
  | "po_status"
  | "leave_request_status"
  | "exception_status"
  | "exception_type"
  | "employment_status"
  | "device_status"
  | "vehicle_status"
  | "lifecycle_status";

// Base shared mapping from token string to tone (frontend_spec.md §12s table 1).
const BASE_TONE: Readonly<Record<string, StatusTone>> = {
  // Green — success family
  active: "success",
  confirmed: "success",
  completed: "success",
  approved: "success",
  justified: "success",
  online: "success",
  resolved: "success",
  success: "success",
  // Amber — warning family
  pending: "warning",
  pending_payment: "warning",
  pending_it: "warning",
  pending_review: "warning",
  draft: "warning",
  in_progress: "warning",
  scheduled: "warning",
  partially_received: "warning",
  degraded: "warning",
  unjustified: "warning",
  // Red — danger family
  cancelled: "danger",
  rejected: "danger",
  terminated: "danger",
  suspended: "danger",
  absent: "danger",
  no_show: "danger",
  failed: "danger",
  decommissioned: "danger",
  retired: "danger",
  // Blue — info family (shared defaults)
  checked_in: "info",
  on_leave: "info",
  sent: "info",
  preparing: "info",
  // Grey — neutral family
  expired: "neutral",
  obsolete: "neutral",
  offline: "neutral",
  maintenance: "neutral",
  neutral: "neutral",
  paused: "neutral",
  // Purple — accent family
  reactivation: "accent",
  transfer: "accent",
  carry_forward: "accent",
};

/**
 * Enum-specific overrides (frontend_spec.md §12s table 2). Lookup order:
 *   1. overrides[enumName][status]
 *   2. BASE_TONE[status]
 *   3. "neutral" fallback
 */
const ENUM_OVERRIDES: Partial<Record<StatusEnum, Readonly<Record<string, StatusTone>>>> = {
  booking_status: {
    confirmed: "info", // awaiting check-in
  },
  order_status: {
    preparing: "info",
  },
  po_status: {
    sent: "info",
  },
  mo_status: {
    active: "info", // vendor on-site, not the generic "active" success semantic
  },
  employment_status: {
    on_leave: "info",
    pending: "warning",
  },
  vehicle_status: {
    maintenance: "warning",
  },
  device_status: {
    maintenance: "warning",
  },
  exception_type: {
    late_arrival: "warning",
    early_departure: "warning",
    missing_clock_in: "danger",
    missing_clock_out: "danger",
    absent: "danger",
  },
};

export function resolveStatusTone(status: string, enumName?: StatusEnum): StatusTone {
  if (enumName) {
    const override = ENUM_OVERRIDES[enumName]?.[status];
    if (override) return override;
  }
  return BASE_TONE[status] ?? "neutral";
}

type StatusBadgeOwnProps = Readonly<{
  status: string;
  enum?: StatusEnum;
  variant?: StatusVariant;
  /** Optional visual override; useful for surfaces that need a custom label. */
  tone?: StatusTone;
  /** Human-readable label; defaults to the raw status token. */
  label?: string;
  /** data-testid passthrough, per CLAUDE.md §6 + prompt.md rule 12. */
  "data-testid"?: string;
}>;

export type StatusBadgeProps = StatusBadgeOwnProps &
  Omit<React.ComponentProps<"span">, "children" | keyof StatusBadgeOwnProps>;

/** Canonical status indicator. */
export function StatusBadge({
  status,
  enum: enumName,
  variant = "default",
  tone: toneOverride,
  label,
  className,
  "data-testid": testId,
  ...props
}: StatusBadgeProps) {
  const tone = toneOverride ?? resolveStatusTone(status, enumName);
  const displayLabel = label ?? status.replaceAll("_", " ");

  if (variant === "dot") {
    return (
      <span
        data-slot="status-badge"
        data-tone={tone}
        data-variant="dot"
        data-testid={testId}
        className={cn(statusBadgeVariants({ tone, variant }), "gap-1.5", className)}
        {...props}
      >
        <span aria-hidden className={dotVariants({ tone })} />
        <span>{displayLabel}</span>
      </span>
    );
  }

  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      data-variant={variant}
      data-testid={testId}
      className={cn(statusBadgeVariants({ tone, variant }), className)}
      {...props}
    >
      <span aria-hidden className={dotVariants({ tone })} />
      <span>{displayLabel}</span>
    </span>
  );
}

export { statusBadgeVariants };
