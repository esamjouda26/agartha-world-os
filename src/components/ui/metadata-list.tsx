import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * MetadataList — semantic `<dl>` grid of label/value pairs.
 *
 * Standardizes the metadata strip on detail pages ("Created by", "Last
 * updated", "Owner", "Version"). Uses `<dl>/<dt>/<dd>` so assistive tech
 * announces the pairs correctly (WCAG 2.2 §1.3.1 / CLAUDE.md §19).
 *
 * Two presentations:
 *   - `inline` — wraps across a row, separator-delimited. Detail headers.
 *   - `grid`   — 2/3-col grid. Settings / profile summaries.
 */

export type MetadataItem = Readonly<{
  label: React.ReactNode;
  /** Rendered inside `<dd>`. Pass a string, badge, or icon+text group. */
  value: React.ReactNode;
  /** Optional stable test anchor suffix. */
  testId?: string;
}>;

export type MetadataListProps = Readonly<{
  items: readonly MetadataItem[];
  layout?: "inline" | "grid";
  /** Track count when `layout = "grid"`. */
  cols?: 2 | 3 | 4;
  className?: string;
  "data-testid"?: string;
}>;

const COLS: Record<NonNullable<MetadataListProps["cols"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function MetadataList({
  items,
  layout = "inline",
  cols = 3,
  className,
  "data-testid": testId,
}: MetadataListProps) {
  if (layout === "inline") {
    return (
      <dl
        data-slot="metadata-list"
        data-layout="inline"
        data-testid={testId}
        className={cn(
          "text-foreground-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
          className,
        )}
      >
        {items.map((item, index) => (
          <div key={index} data-testid={item.testId} className="flex items-center gap-1.5">
            <dt className="text-foreground-subtle">{item.label}</dt>
            <dd className="text-foreground font-medium">{item.value}</dd>
            {index < items.length - 1 ? (
              <span aria-hidden className="text-border-strong">
                ·
              </span>
            ) : null}
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl
      data-slot="metadata-list"
      data-layout="grid"
      data-testid={testId}
      className={cn("grid grid-cols-1 gap-x-6 gap-y-3 text-sm", COLS[cols], className)}
    >
      {items.map((item, index) => (
        <div key={index} data-testid={item.testId} className="flex flex-col gap-0.5">
          <dt className="text-foreground-subtle text-[11px] font-medium tracking-wider uppercase">
            {item.label}
          </dt>
          <dd className="text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
