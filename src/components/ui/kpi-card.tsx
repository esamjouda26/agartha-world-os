import * as React from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * KPI card + row — prompt.md §2B-D.1.
 * Value-forward dashboard tile with optional trend indicator and a slot for a
 * sparkline or other micro-visualization injected by callers (so the primitive
 * stays chart-library agnostic).
 */

const kpiCardVariants = cva(
  "bg-card text-card-foreground border-border flex flex-col gap-2 rounded-lg border p-4 shadow-xs transition-colors",
  {
    variants: {
      density: {
        compact: "gap-1 p-3",
        comfortable: "gap-2 p-4",
        spacious: "gap-3 p-6",
      },
      emphasis: {
        default: "",
        accent: "border-brand-primary/40 bg-brand-primary/5",
      },
    },
    defaultVariants: {
      density: "comfortable",
      emphasis: "default",
    },
  },
);

export type KpiTrendDirection = "up" | "down" | "flat";

type KpiTrend = Readonly<{
  direction: KpiTrendDirection;
  /** Short label like "+12.4%" or "−3 vs yesterday". */
  label: string;
  /**
   * Whether an "up" trend is semantically good (revenue: true) or bad
   * (incidents: false). Drives the color of the arrow + label.
   */
  goodWhen?: "up" | "down";
}>;

type KpiCardOwnProps = Readonly<{
  label: string;
  value: React.ReactNode;
  /** Caption rendered under the value, e.g. "last 30 days". */
  caption?: string;
  trend?: KpiTrend;
  /** Optional sparkline or micro-chart — rendered right of the value. */
  sparkline?: React.ReactNode;
  icon?: React.ReactNode;
  "data-testid"?: string;
}>;

export type KpiCardProps = KpiCardOwnProps &
  VariantProps<typeof kpiCardVariants> &
  Omit<React.ComponentProps<"div">, keyof KpiCardOwnProps>;

function trendTone(trend: KpiTrend): "success" | "danger" | "neutral" {
  if (trend.direction === "flat") return "neutral";
  const good = trend.goodWhen ?? "up";
  if (trend.direction === good) return "success";
  return "danger";
}

function TrendIndicator({ trend }: Readonly<{ trend: KpiTrend }>) {
  const tone = trendTone(trend);
  const Icon =
    trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : ArrowRight;
  const color =
    tone === "success"
      ? "text-status-success-foreground"
      : tone === "danger"
        ? "text-status-danger-foreground"
        : "text-foreground-muted";
  return (
    <span
      data-slot="kpi-trend"
      data-direction={trend.direction}
      data-tone={tone}
      className={cn("inline-flex items-center gap-1 text-xs font-medium", color)}
    >
      <Icon aria-hidden className="size-3" />
      <span>{trend.label}</span>
    </span>
  );
}

export function KpiCard({
  label,
  value,
  caption,
  trend,
  sparkline,
  icon,
  density,
  emphasis,
  className,
  "data-testid": testId,
  ...props
}: KpiCardProps) {
  return (
    <div
      data-slot="kpi-card"
      data-testid={testId}
      className={cn(kpiCardVariants({ density, emphasis }), className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground-subtle text-xs font-medium tracking-wider uppercase">
          {label}
        </p>
        {icon ? (
          <span aria-hidden className="text-foreground-subtle">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-foreground text-2xl leading-none font-semibold tabular-nums">
            {value}
          </p>
          {caption ? <p className="text-foreground-muted text-xs">{caption}</p> : null}
        </div>
        {sparkline ? (
          <div data-slot="kpi-sparkline" className="h-8 w-24 shrink-0">
            {sparkline}
          </div>
        ) : null}
      </div>
      {trend ? <TrendIndicator trend={trend} /> : null}
    </div>
  );
}

type KpiCardRowProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}>;

/**
 * Horizontal list of KPI cards that auto-collapse to a stacked column on
 * narrow viewports. Consumers pass `<KpiCard />` children; the row controls
 * only gap + grid responsiveness.
 */
export function KpiCardRow({ children, className, "data-testid": testId }: KpiCardRowProps) {
  return (
    <div
      data-slot="kpi-card-row"
      data-testid={testId}
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}
    >
      {children}
    </div>
  );
}

export { kpiCardVariants };
