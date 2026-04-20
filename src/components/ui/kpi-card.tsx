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
  // Premium tile: soft hairline border + hover lift + gold border-accent
  // on hover. Radius bumped to xl so it feels softer alongside the rest
  // of the new design language.
  "group/kpi bg-card text-card-foreground border-border/80 flex flex-col gap-2 rounded-xl border p-4 shadow-xs transition-[transform,box-shadow,border-color] duration-[var(--duration-layout)] [transition-timing-function:var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-md hover:border-brand-primary/30",
  {
    variants: {
      density: {
        compact: "gap-1 p-3",
        comfortable: "gap-2 p-4",
        spacious: "gap-3 p-6",
      },
      emphasis: {
        default: "",
        // Accent emphasis: soft gold tint + gold glow in dark mode.
        // Gradient overlay gives the tile a subtle "hero" feel without a
        // second background element.
        accent:
          "border-brand-primary/40 bg-gradient-to-br from-brand-primary/[0.07] via-card to-card dark:shadow-glow-brand",
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
        <p className="text-foreground-subtle text-[11px] font-medium tracking-wider uppercase">
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden
            className="text-foreground-subtle group-hover/kpi:text-brand-primary transition-colors"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          {/* Fluid value: scales 24px → 30px across viewports via the
              clamp-based text-3xl token from globals.css. Tabular numerals
              keep alignment across cards in a KpiCardRow. */}
          <p className="text-foreground text-3xl leading-none font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {caption ? <p className="text-foreground-muted text-xs">{caption}</p> : null}
        </div>
        {sparkline ? (
          <div data-slot="kpi-sparkline" className="h-9 w-24 shrink-0">
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

/**
 * Sparkline — tiny SVG area-fill line chart, sized to fit in a KpiCard's
 * sparkline slot (h-9 × w-24 by default). Chart-library-agnostic: takes
 * a raw `number[]` and renders a single-stroke path + translucent
 * gradient fill below. Scale is min–max of the input; pass a pre-padded
 * array if you want a fixed-range axis.
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
