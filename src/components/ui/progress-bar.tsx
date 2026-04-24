import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * ProgressBar — enterprise-grade progress / fill indicator.
 *
 * Replaces the repeated `<div className="bg-muted h-1.5 overflow-hidden rounded-full">
 * <div className="... h-full" style={{width: `${pct}%`}}>` pattern found 20+ times
 * across Phase 6 dashboards. Every percentage bar in every admin and management
 * page routes through this primitive.
 *
 * Usage:
 *   <ProgressBar value={72} tone="warning" />
 *   <ProgressBar value={34} max={80} tone="brand" size="lg" />
 */

const trackVariants = cva("relative w-full overflow-hidden", {
  variants: {
    size: {
      xs: "h-1 rounded-full",
      sm: "h-1.5 rounded-full",
      md: "h-2 rounded-full",
      lg: "h-3 rounded-lg",
    },
    track: {
      muted: "bg-muted",
      soft: "bg-muted/40",
      surface: "bg-surface/80",
    },
  },
  defaultVariants: { size: "sm", track: "muted" },
});

const fillVariants = cva(
  "absolute inset-y-0 left-0 transition-[width] duration-[var(--duration-layout)] [transition-timing-function:var(--ease-standard)]",
  {
    variants: {
      tone: {
        brand: "bg-brand-primary",
        success: "bg-status-success-solid",
        warning: "bg-status-warning-solid",
        danger: "bg-status-danger-solid",
        neutral: "bg-status-neutral-solid",
        info: "bg-status-info-solid",
      },
      rounded: {
        full: "rounded-full",
        none: "rounded-none",
        right: "rounded-r-full",
      },
    },
    defaultVariants: { tone: "brand", rounded: "right" },
  },
);

export type ProgressBarTone = NonNullable<VariantProps<typeof fillVariants>["tone"]>;

export type ProgressBarProps = Readonly<{
  /** 0–100 percentage, OR an absolute value scaled against `max`. */
  value: number;
  /** Scale denominator. When provided, pct = value/max*100. Defaults to 100 (value is already %). */
  max?: number;
  tone?: ProgressBarTone;
  size?: NonNullable<VariantProps<typeof trackVariants>["size"]>;
  track?: NonNullable<VariantProps<typeof trackVariants>["track"]>;
  rounded?: NonNullable<VariantProps<typeof fillVariants>["rounded"]>;
  /** Clamp: fill never exceeds 100%. Default: true. */
  clamp?: boolean;
  className?: string;
  "data-testid"?: string;
  "aria-label"?: string;
}>;

export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  size = "sm",
  track = "muted",
  rounded = "right",
  clamp = true,
  className,
  "data-testid": testId,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const raw = max > 0 ? (value / max) * 100 : 0;
  const pct = clamp ? Math.min(100, Math.max(0, raw)) : raw;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn(trackVariants({ size, track }), className)}
    >
      <div className={fillVariants({ tone, rounded })} style={{ width: `${pct}%` }} aria-hidden />
    </div>
  );
}

/**
 * Derive a tone from a percentage value using threshold ranges.
 * Matches the enterprise "green below X, amber X–Y, red above Y" convention.
 *
 * @example
 *   progressTone(85, { warn: 70, crit: 90 }) → "warning"
 *   progressTone(95, { warn: 70, crit: 90 }) → "danger"
 */
export function progressTone(
  pct: number,
  thresholds: Readonly<{ warn?: number; crit?: number }> = {},
): ProgressBarTone {
  const { warn = 70, crit = 90 } = thresholds;
  if (pct >= crit) return "danger";
  if (pct >= warn) return "warning";
  return "success";
}
