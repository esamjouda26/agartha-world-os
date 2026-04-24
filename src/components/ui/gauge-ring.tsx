import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * GaugeRing — SVG circular arc gauge for occupancy, utilisation, and score
 * visualizations.
 *
 * Renders a track arc + fill arc pair at a configurable sweep angle (default
 * 270° — the classic dashboard gauge shape). The fill animates via SVG
 * `stroke-dashoffset` CSS transition, respecting `prefers-reduced-motion`.
 *
 * Enterprise use-cases:
 *   - Zone occupancy (operations dashboard)
 *   - Overall facility load (system-health)
 *   - Leave utilisation (workforce)
 *   - Slot fill rate (revenue / operations)
 *
 * Usage:
 *   <GaugeRing value={72} size={80} tone="warning" label="72%" caption="Occupancy" />
 */

export type GaugeRingTone = "success" | "warning" | "danger" | "brand" | "neutral" | "info";

const STROKE: Record<GaugeRingTone, string> = {
  success: "var(--status-success-solid)",
  warning: "var(--status-warning-solid)",
  danger: "var(--status-danger-solid)",
  brand: "var(--brand-primary)",
  neutral: "var(--status-neutral-solid)",
  info: "var(--status-info-solid)",
};

export type GaugeRingProps = Readonly<{
  /** 0–100 percentage. */
  value: number;
  /** Canvas size in CSS px. Defaults to 80. */
  size?: number;
  tone?: GaugeRingTone;
  /**
   * Arc sweep in degrees. 270 = classic gauge (start bottom-left, end bottom-right).
   * 360 = full donut.
   */
  sweep?: number;
  /** Stroke width in px relative to the SVG coordinate system (default 10). */
  strokeWidth?: number;
  /** Label rendered in the centre of the ring. */
  label?: React.ReactNode;
  /** Smaller sub-label below the main label. */
  caption?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
  "aria-label"?: string;
}>;

export function GaugeRing({
  value,
  size = 80,
  tone = "brand",
  sweep = 270,
  strokeWidth = 10,
  label,
  caption,
  className,
  "data-testid": testId,
  "aria-label": ariaLabel,
}: GaugeRingProps) {
  const pct = Math.min(100, Math.max(0, value));
  const viewBox = 100; // Coordinate system is 0-100 regardless of display size
  const cx = 50;
  const cy = 50;
  const r = 50 - strokeWidth / 2 - 1; // 1px inset so stroke doesn't clip

  // Arc geometry
  const startAngleDeg = 90 + (360 - sweep) / 2;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const circumference = 2 * Math.PI * r;
  const arcLength = (sweep / 360) * circumference;
  const fillLength = (pct / 100) * arcLength;
  const dashOffset = arcLength - fillLength;

  // Start and end points for the arc path
  const startRad = toRad(startAngleDeg);
  const endRad = toRad(startAngleDeg + sweep);
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = sweep > 180 ? 1 : 0;

  const arcPath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  const strokeColor = STROKE[tone];

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      data-testid={testId}
    >
      <svg
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        width={size}
        height={size}
        className="absolute inset-0"
        role="img"
        aria-label={ariaLabel ?? `Gauge: ${pct}%`}
        aria-hidden={!ariaLabel}
      >
        {/* Track */}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />
        {/* Fill — animates via dashoffset */}
        <path
          d={arcPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-[var(--duration-layout)] [transition-timing-function:var(--ease-standard)] motion-reduce:transition-none"
          style={{ transformOrigin: "50% 50%" }}
        />
      </svg>

      {/* Centre label */}
      {(label != null || caption != null) && (
        <div className="relative flex flex-col items-center justify-center text-center">
          {label != null && (
            <span
              className="text-foreground leading-none font-bold tabular-nums"
              style={{ fontSize: Math.round(size * 0.2) }}
            >
              {label}
            </span>
          )}
          {caption != null && (
            <span
              className="text-foreground-muted leading-none"
              style={{ fontSize: Math.round(size * 0.12) }}
            >
              {caption}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
