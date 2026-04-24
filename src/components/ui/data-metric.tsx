import * as React from "react";

import { cn } from "@/lib/utils";
import { StatTrend, type StatTrendProps } from "@/components/ui/stat-trend";

/**
 * DataMetric — single metric display with optional icon, trend, and context label.
 *
 * Mid-weight between a bare `<p>` and a full `<KpiCard>`:
 *   - No hover lift, no gradient emphasis.
 *   - Designed for use inside `SectionCard` summary rows, report panels,
 *     and inline dashboard metrics (e.g. revenue trend totals).
 *   - Supports horizontal and vertical layouts.
 *
 * Usage:
 *   <DataMetric label="Total Revenue" value="MYR 24,500" trend={{ direction: "up", label: "+12%" }} />
 *   <DataMetric label="Avg Rating" value="8.4 / 10" icon={<Star />} layout="horizontal" />
 */

export type DataMetricTone = "default" | "success" | "warning" | "danger" | "muted";

const VALUE_TONE: Record<DataMetricTone, string> = {
  default: "text-foreground",
  success: "text-status-success-foreground",
  warning: "text-status-warning-foreground",
  danger: "text-status-danger-foreground",
  muted: "text-foreground-muted",
};

export type DataMetricProps = Readonly<{
  label: React.ReactNode;
  value: React.ReactNode;
  /** Smaller contextual sub-value or unit (e.g. "of 120", "/ 10"). */
  context?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: StatTrendProps;
  tone?: DataMetricTone;
  /**
   * vertical — label on top, value below (default, used in KPI grids).
   * horizontal — label on left, value on right (used in summary rows).
   */
  layout?: "vertical" | "horizontal";
  /**
   * Value text size:
   *   sm — text-lg  (dense panels, section summaries)
   *   md — text-2xl (default dashboard use)
   *   lg — text-4xl (hero metric, standalone)
   */
  size?: "sm" | "md" | "lg";
  className?: string;
  "data-testid"?: string;
}>;

export function DataMetric({
  label,
  value,
  context,
  icon,
  trend,
  tone = "default",
  layout = "vertical",
  size = "md",
  className,
  "data-testid": testId,
}: DataMetricProps) {
  const valueSizeClass = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" }[size];
  const valueColor = VALUE_TONE[tone];

  if (layout === "horizontal") {
    return (
      <div
        className={cn("flex items-center justify-between gap-4", className)}
        data-testid={testId}
      >
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="text-foreground-subtle" aria-hidden>
              {icon}
            </span>
          ) : null}
          <span className="text-foreground-subtle text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "leading-none font-semibold tracking-tight tabular-nums",
              valueSizeClass,
              valueColor,
            )}
          >
            {value}
          </span>
          {context ? <span className="text-foreground-muted text-xs">{context}</span> : null}
          {trend ? <StatTrend {...trend} size="sm" /> : null}
        </div>
      </div>
    );
  }

  // vertical (default)
  return (
    <div className={cn("flex flex-col gap-1", className)} data-testid={testId}>
      <div className="flex items-center gap-1.5">
        {icon ? (
          <span className="text-foreground-subtle size-3.5" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span className="text-foreground-subtle text-[11px] font-medium tracking-wider uppercase">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span
          className={cn(
            "leading-none font-bold tracking-tight tabular-nums",
            valueSizeClass,
            valueColor,
          )}
        >
          {value}
        </span>
        {context ? <span className="text-foreground-muted text-sm">{context}</span> : null}
      </div>
      {trend ? <StatTrend {...trend} size="sm" className="mt-0.5" /> : null}
    </div>
  );
}

/** Grid of DataMetric items — replaces repeated flex/grid blocks in dashboard summaries. */
export type DataMetricGridProps = Readonly<{
  metrics: ReadonlyArray<DataMetricProps>;
  cols?: 2 | 3 | 4;
  dividers?: boolean;
  className?: string;
  "data-testid"?: string;
}>;

export function DataMetricGrid({
  metrics,
  cols = 3,
  dividers = true,
  className,
  "data-testid": testId,
}: DataMetricGridProps) {
  const colClass = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[cols];
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        colClass,
        dividers && "divide-border-subtle divide-y sm:divide-x sm:divide-y-0",
        className,
      )}
      data-testid={testId}
    >
      {metrics.map((m, idx) => (
        <DataMetric
          key={idx}
          {...m}
          className={cn(dividers && idx > 0 ? "sm:pl-4" : "", m.className)}
        />
      ))}
    </div>
  );
}
