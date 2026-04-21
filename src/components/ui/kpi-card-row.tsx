import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Horizontal row of KPI cards that auto-collapses to a stacked column on
 * narrow viewports. Consumers pass `<KpiCard />` children; the row controls
 * only gap + grid responsiveness.
 *
 * prompt.md §2B-D.1 — companion primitive to `KpiCard`.
 */
type KpiCardRowProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}>;

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
