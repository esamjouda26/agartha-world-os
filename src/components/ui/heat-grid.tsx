import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * HeatGrid — grid of colour-coded value tiles used for slot-utilisation,
 * capacity calendars, and occupancy heatmaps.
 *
 * Replaces the two near-identical inline heat-strip implementations in:
 *   - revenue-dashboard-view.tsx (UtilHeatStrip — 8×8 boxes)
 *   - operations-dashboard-view.tsx (SlotHeatStrip — 9×9 boxes)
 *   - costs-dashboard-view.tsx
 *
 * Usage:
 *   <HeatGrid
 *     items={slotUtilization.map(d => ({ key: d.date, value: d.utilPct, label: String(d.utilPct) }))}
 *     getTone={pct => pct >= 90 ? "danger" : pct >= 70 ? "warning" : "success"}
 *     legend={[{ range: "<70%", tone: "success" }, { range: "70–90%", tone: "warning" }, { range: ">90%", tone: "danger" }]}
 *   />
 */

export type HeatGridTone = "success" | "warning" | "danger" | "neutral" | "info";

const TILE_BG: Record<HeatGridTone, string> = {
  success: "bg-status-success-soft border-status-success-border text-status-success-foreground",
  warning: "bg-status-warning-soft border-status-warning-border text-status-warning-foreground",
  danger: "bg-status-danger-soft  border-status-danger-border  text-status-danger-foreground",
  neutral: "bg-status-neutral-soft border-status-neutral-border text-status-neutral-foreground",
  info: "bg-status-info-soft    border-status-info-border    text-status-info-foreground",
};

const LEGEND_DOT: Record<HeatGridTone, string> = {
  success: "bg-status-success-solid",
  warning: "bg-status-warning-solid",
  danger: "bg-status-danger-solid",
  neutral: "bg-status-neutral-solid",
  info: "bg-status-info-solid",
};

export type HeatGridItem = Readonly<{
  /** Unique key (usually ISO date string). */
  key: string;
  /** Numeric value used to derive tone and optionally display in-tile. */
  value: number;
  /** Label rendered inside the tile (defaults to `String(value)`). */
  label?: string;
  /** Hover tooltip override. */
  tooltip?: string;
}>;

export type HeatGridLegendItem = Readonly<{
  range: string;
  tone: HeatGridTone;
}>;

export type HeatGridProps = Readonly<{
  items: ReadonlyArray<HeatGridItem>;
  /** Map a value → display tone. */
  getTone: (value: number) => HeatGridTone;
  /** Empty state message when items.length === 0. */
  emptyLabel?: string;
  /**
   * Tile size preset:
   *   sm — 32×32 px  (compact calender-style grids)
   *   md — 36×36 px  (default — operations/revenue dashboards)
   *   lg — 44×44 px  (hero displays)
   */
  size?: "sm" | "md" | "lg";
  /**
   * Number of columns before wrapping. Omit for auto-wrap.
   */
  columns?: number;
  /** Gap between tiles. */
  gap?: "1" | "1.5" | "2";
  /** Optional legend strip rendered below the grid. */
  legend?: ReadonlyArray<HeatGridLegendItem>;
  className?: string;
  "data-testid"?: string;
}>;

export function HeatGrid({
  items,
  getTone,
  emptyLabel = "No data in range.",
  size = "md",
  columns,
  gap = "1.5",
  legend,
  className,
  "data-testid": testId,
}: HeatGridProps) {
  const tileClass = {
    sm: "size-8 text-[10px]",
    md: "size-9 text-[11px]",
    lg: "size-11 text-xs",
  }[size];

  const gapClass = { "1": "gap-1", "1.5": "gap-1.5", "2": "gap-2" }[gap];

  if (items.length === 0) {
    return <p className="text-foreground-muted py-3 text-center text-sm">{emptyLabel}</p>;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} data-testid={testId}>
      {/* Tile grid */}
      <div
        className={cn("flex flex-wrap", gapClass)}
        style={
          columns
            ? { display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
            : undefined
        }
        role="group"
        aria-label="Heat grid"
      >
        {items.map((item) => {
          const tone = getTone(item.value);
          const label = item.label ?? String(item.value);
          const tooltip = item.tooltip ?? `${item.key}: ${label}`;
          return (
            <div
              key={item.key}
              title={tooltip}
              className={cn(
                "flex items-center justify-center rounded-lg border font-semibold tabular-nums",
                "transition-transform duration-[var(--duration-micro)] hover:scale-110",
                tileClass,
                TILE_BG[tone],
              )}
              aria-label={tooltip}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {legend && legend.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs" aria-label="Legend">
          {legend.map((l) => (
            <span key={l.range} className="flex items-center gap-1.5">
              <span
                className={cn("inline-block size-2 rounded-sm", LEGEND_DOT[l.tone])}
                aria-hidden
              />
              <span className="text-foreground-muted">{l.range}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
