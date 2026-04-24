"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { ProgressBar, type ProgressBarTone } from "@/components/ui/progress-bar";

/**
 * BarListItem — enterprise-grade label + fill-bar + value row.
 *
 * Replaces the 12+ duplicated `<li className="flex flex-col gap-1">` patterns
 * across revenue, guests, workforce, and operations dashboards. Exposes consistent
 * spacing, motion, and tone semantics.
 *
 * Usage:
 *   <BarListItem label="Café" value={fmt(12_000)} pct={80} tone="brand" />
 *   <BarListItem label="Expired" value={fmt(320)} pct={45} tone="warning"
 *     leading={<span className="size-2 bg-status-warning-solid rounded-full" />}
 *     trailing={<Badge>32%</Badge>} />
 */

export type BarListItemProps = Readonly<{
  label: React.ReactNode;
  value: React.ReactNode;
  /** 0–100 fill percentage (already computed by caller). */
  pct: number;
  tone?: ProgressBarTone;
  /**
   * Supplementary text next to the label (e.g. "×12 orders", "32 units").
   * Renders left of the value in a muted smaller font.
   */
  meta?: React.ReactNode;
  /** Slot before the label — icon, color dot, rank number. */
  leading?: React.ReactNode;
  /** Slot after the value — badge, % pill, comparison delta. */
  trailing?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
  "data-testid"?: string;
}>;

export function BarListItem({
  label,
  value,
  pct,
  tone = "brand",
  meta,
  leading,
  trailing,
  size = "md",
  className,
  "data-testid": testId,
}: BarListItemProps) {
  const labelSize = size === "sm" ? "text-xs" : "text-sm";
  const valueSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <li className={cn("flex flex-col gap-1", className)} data-testid={testId}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {leading ? (
            <span className="shrink-0" aria-hidden>
              {leading}
            </span>
          ) : null}
          <span className={cn("text-foreground min-w-0 truncate font-medium", labelSize)}>
            {label}
          </span>
          {meta ? <span className="text-foreground-muted shrink-0 text-xs">{meta}</span> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn("text-foreground font-semibold tabular-nums", valueSize)}>
            {value}
          </span>
          {trailing}
        </div>
      </div>
      {/* Fill bar */}
      <ProgressBar value={pct} tone={tone} size={size === "sm" ? "xs" : "sm"} />
    </li>
  );
}

/** Convenience wrapper: renders an ordered `<ul>` of BarListItems from an array. */
export type BarListProps = Readonly<{
  items: ReadonlyArray<Omit<BarListItemProps, "pct"> & { rawValue: number }>;
  tone?: ProgressBarTone;
  /** Compute pct as rawValue / max(rawValues). */
  normalize?: boolean;
  size?: "sm" | "md";
  gap?: "sm" | "md" | "lg";
  className?: string;
  "data-testid"?: string;
}>;

export function BarList({
  items,
  tone = "brand",
  normalize = true,
  size = "md",
  gap = "md",
  className,
  "data-testid": testId,
}: BarListProps) {
  const maxVal = normalize ? Math.max(...items.map((i) => i.rawValue), 1) : 100;

  const gapClass = gap === "sm" ? "gap-1.5" : gap === "lg" ? "gap-4" : "gap-3";

  return (
    <ul role="list" className={cn("flex flex-col", gapClass, className)} data-testid={testId}>
      {items.map((item, idx) => {
        const { rawValue, ...rest } = item;
        return (
          <BarListItem
            key={idx}
            {...rest}
            pct={(rawValue / maxVal) * 100}
            tone={rest.tone ?? tone}
            size={size}
          />
        );
      })}
    </ul>
  );
}
