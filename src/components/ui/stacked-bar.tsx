import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * StackedBar — horizontal proportional bar split into labelled segments.
 *
 * Enterprise use-cases: NPS breakdown (promoter/passive/detractor), budget
 * allocation, status mix. Single source of truth for the pattern previously
 * duplicated in the guests dashboard.
 *
 * Usage:
 *   <StackedBar
 *     segments={[
 *       { label: "Promoters", value: 120, tone: "success" },
 *       { label: "Passives",  value: 45,  tone: "warning" },
 *       { label: "Detractors", value: 35, tone: "danger" },
 *     ]}
 *     legend
 *   />
 */

export type StackedBarTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "brand"
  | "accent";

const FILL: Record<StackedBarTone, string> = {
  success: "bg-status-success-solid",
  warning: "bg-status-warning-solid",
  danger: "bg-status-danger-solid",
  info: "bg-status-info-solid",
  neutral: "bg-status-neutral-solid",
  brand: "bg-brand-primary",
  accent: "bg-brand-accent",
};

const DOT: Record<StackedBarTone, string> = {
  success: "bg-status-success-solid",
  warning: "bg-status-warning-solid",
  danger: "bg-status-danger-solid",
  info: "bg-status-info-solid",
  neutral: "bg-status-neutral-solid",
  brand: "bg-brand-primary",
  accent: "bg-brand-accent",
};

export type StackedBarSegment = Readonly<{
  label: string;
  value: number;
  tone: StackedBarTone;
  /**
   * Threshold below which the in-bar label is hidden to prevent overflow.
   * Defaults to 8% of total.
   */
  labelThreshold?: number;
}>;

export type StackedBarProps = Readonly<{
  segments: ReadonlyArray<StackedBarSegment>;
  /**
   * Bar height:
   *  sm — 20px (space-tight dashboards)
   *  md — 28px (default, comfortable)
   *  lg — 36px (hero placement, e.g. above a legend)
   */
  height?: "sm" | "md" | "lg";
  /** Show percentage labels inside each segment (when segment is wide enough). */
  inlineLabels?: boolean;
  /** Show a compact legend row below the bar. */
  legend?: boolean;
  /** Layout for the legend items. */
  legendLayout?: "row" | "grid";
  className?: string;
  "data-testid"?: string;
}>;

export function StackedBar({
  segments,
  height = "md",
  inlineLabels = true,
  legend = true,
  legendLayout = "row",
  className,
  "data-testid": testId,
}: StackedBarProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const heightClass = { sm: "h-5", md: "h-7", lg: "h-9" }[height];
  const textClass = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" }[height];

  return (
    <div className={cn("flex flex-col gap-3", className)} data-testid={testId}>
      {/* Bar */}
      <div
        className={cn("flex w-full overflow-hidden rounded-lg", heightClass)}
        role="group"
        aria-label="Stacked bar chart"
      >
        {segments.map((seg, idx) => {
          const pct = (seg.value / total) * 100;
          const threshold = seg.labelThreshold ?? 8;
          const showLabel = inlineLabels && pct >= threshold;
          const isFirst = idx === 0;
          const isLast = idx === segments.length - 1;

          return (
            <div
              key={seg.label}
              className={cn(
                "flex items-center justify-center transition-[width] duration-[var(--duration-layout)] [transition-timing-function:var(--ease-standard)]",
                FILL[seg.tone],
                isFirst ? "rounded-l-lg" : "",
                isLast ? "rounded-r-lg" : "",
              )}
              style={{ width: `${pct}%` }}
              role="img"
              aria-label={`${seg.label}: ${Math.round(pct)}%`}
            >
              {showLabel && (
                <span
                  className={cn(
                    "font-semibold text-white tabular-nums drop-shadow-sm select-none",
                    textClass,
                  )}
                >
                  {Math.round(pct)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {legend && (
        <div
          className={cn(
            "flex flex-wrap gap-x-4 gap-y-1.5 text-xs",
            legendLayout === "grid" ? "grid grid-cols-2 sm:grid-cols-3" : "flex-row",
          )}
        >
          {segments.map((seg) => {
            const pct = (seg.value / total) * 100;
            return (
              <div key={seg.label} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 shrink-0 rounded-full", DOT[seg.tone])} aria-hidden />
                <span className="text-foreground-subtle">{seg.label}</span>
                <span className="text-foreground font-semibold tabular-nums">{seg.value}</span>
                <span className="text-foreground-muted">({Math.round(pct)}%)</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
