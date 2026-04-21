import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tiny SVG area-fill line chart, sized to fit in a KpiCard's sparkline slot
 * (h-9 × w-24 by default). Chart-library-agnostic: takes a raw `number[]`
 * and renders a single-stroke path + translucent gradient fill below.
 * Scale is min–max of the input; pass a pre-padded array for a fixed-range
 * axis.
 *
 * Example:
 *   <KpiCard
 *     label="This week"
 *     value={`${hours}h`}
 *     sparkline={<Sparkline data={weeklyHours} />}
 *   />
 */
type SparklineProps = Readonly<{
  data: readonly number[];
  /** Tone controls stroke + fill color. Defaults to brand. */
  tone?: "brand" | "success" | "warning" | "danger" | "neutral";
  /** SVG aspect box. The parent slot's width/height drives display size. */
  width?: number;
  height?: number;
  /** Accessible label; omit for purely decorative sparklines. */
  label?: string;
  className?: string;
}>;

const SPARKLINE_STROKE: Record<NonNullable<SparklineProps["tone"]>, string> = {
  brand: "var(--brand-primary)",
  success: "var(--status-success-solid)",
  warning: "var(--status-warning-solid)",
  danger: "var(--status-danger-solid)",
  neutral: "var(--status-neutral-solid)",
};

export function Sparkline({
  data,
  tone = "brand",
  width = 96,
  height = 36,
  label,
  className,
}: SparklineProps) {
  // Degenerate inputs → render nothing rather than a malformed SVG path.
  if (data.length < 2) {
    return (
      <div
        aria-hidden={label ? undefined : true}
        role={label ? "img" : undefined}
        aria-label={label}
        className={cn("text-foreground-subtle flex items-end justify-end text-xs", className)}
        style={{ width, height }}
      >
        {data.length === 1 ? data[0] : null}
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1e-6, max - min);
  const stepX = width / (data.length - 1);
  const padY = 2; // 2px top/bottom padding so the stroke isn't clipped
  const usableH = height - padY * 2;

  const points = data.map((value, i) => {
    const x = i * stepX;
    const y = padY + (1 - (value - min) / range) * usableH;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    `${linePath} ` +
    `L${points[points.length - 1]!.x.toFixed(2)},${height} ` +
    `L${points[0]!.x.toFixed(2)},${height} Z`;

  const stroke = SPARKLINE_STROKE[tone];
  const gradientId = React.useId();

  return (
    <svg
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      className={cn("block", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
