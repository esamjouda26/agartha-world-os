import * as React from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * StatTrend — standalone trend pill (arrow + delta label).
 *
 * Extracted sibling to `<KpiCard>` so trend indicators can live outside
 * a KPI tile (next to a headline number, inside a report summary, on a
 * dashboard hero). Same semantics as the inline `<TrendIndicator>` in
 * `kpi-card.tsx` — direction + label + optional `goodWhen` polarity.
 *
 * When inside a `<KpiCard>`, pass the trend via the card's `trend` prop
 * instead of rendering `<StatTrend>` manually — the card renders one.
 */

export type StatTrendDirection = "up" | "down" | "flat";

export type StatTrendProps = Readonly<{
  direction: StatTrendDirection;
  /** Delta label like "+12.4%" or "−3 vs yesterday". */
  label: React.ReactNode;
  /**
   * Whether an "up" trend is semantically good (revenue: "up") or bad
   * (incidents: "down"). Drives the foreground tone. Defaults to `"up"`.
   */
  goodWhen?: "up" | "down";
  /** Size scale. */
  size?: "sm" | "md";
  /** Render arrow on the right rather than the left. */
  arrowPosition?: "leading" | "trailing";
  className?: string;
  "data-testid"?: string;
}>;

function trendTone(
  direction: StatTrendDirection,
  goodWhen: "up" | "down",
): "success" | "danger" | "neutral" {
  if (direction === "flat") return "neutral";
  return direction === goodWhen ? "success" : "danger";
}

export function StatTrend({
  direction,
  label,
  goodWhen = "up",
  size = "sm",
  arrowPosition = "leading",
  className,
  "data-testid": testId,
}: StatTrendProps) {
  const tone = trendTone(direction, goodWhen);
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : ArrowRight;
  const toneClass =
    tone === "success"
      ? "text-status-success-foreground"
      : tone === "danger"
        ? "text-status-danger-foreground"
        : "text-foreground-muted";
  const sizeClass = size === "md" ? "text-sm [&_svg]:size-3.5" : "text-xs [&_svg]:size-3";

  return (
    <span
      data-slot="stat-trend"
      data-direction={direction}
      data-tone={tone}
      data-testid={testId}
      className={cn("inline-flex items-center gap-1 font-medium", sizeClass, toneClass, className)}
    >
      {arrowPosition === "leading" ? <Icon aria-hidden /> : null}
      <span>{label}</span>
      {arrowPosition === "trailing" ? <Icon aria-hidden /> : null}
    </span>
  );
}
