import * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Canonical skeleton kit — prompt.md §2B-D.9.
 * Every downstream `loading.tsx` must compose these; bespoke per-route
 * skeletons are forbidden (prompt.md rule 11). Keep the shapes parametric so
 * loading states match the final layout without the author having to eyeball
 * pixel widths.
 */

type WithTestId = Readonly<{ "data-testid"?: string }>;

export type TableSkeletonProps = Readonly<{
  rows?: number;
  cols?: number;
  showHeader?: boolean;
  className?: string;
}> &
  WithTestId;

/** Skeleton shaped like `<DataTable>`. Default 6×4 grid at comfortable density. */
export function TableSkeleton({
  rows = 6,
  cols = 4,
  showHeader = true,
  className,
  "data-testid": testId,
}: TableSkeletonProps) {
  const columns = Array.from({ length: cols });
  const bodyRows = Array.from({ length: rows });
  return (
    <div
      data-slot="table-skeleton"
      data-testid={testId}
      aria-hidden
      className={cn("border-border bg-card overflow-hidden rounded-lg border", className)}
    >
      {showHeader ? (
        <div
          className="border-border-subtle grid gap-3 border-b px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {columns.map((_, index) => (
            <Skeleton key={`th-${index}`} className="h-3 w-24" />
          ))}
        </div>
      ) : null}
      <div className="divide-border-subtle divide-y">
        {bodyRows.map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-3 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {columns.map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className={cn("h-4", colIndex === 0 ? "w-3/4" : "w-5/6")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export type FormSkeletonProps = Readonly<{
  fields?: number;
  submit?: boolean;
  className?: string;
}> &
  WithTestId;

/** Stacked field skeleton. */
export function FormSkeleton({
  fields = 4,
  submit = true,
  className,
  "data-testid": testId,
}: FormSkeletonProps) {
  return (
    <div
      data-slot="form-skeleton"
      data-testid={testId}
      aria-hidden
      className={cn("flex flex-col gap-4", className)}
    >
      {Array.from({ length: fields }).map((_, index) => (
        <div key={`field-${index}`} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      {submit ? (
        <div className="mt-2 flex justify-end">
          <Skeleton className="h-9 w-28" />
        </div>
      ) : null}
    </div>
  );
}

export type CardSkeletonProps = Readonly<{
  lines?: number;
  className?: string;
}> &
  WithTestId;

/** Generic card — title + N body lines + footer action. */
export function CardSkeleton({ lines = 3, className, "data-testid": testId }: CardSkeletonProps) {
  return (
    <div
      data-slot="card-skeleton"
      data-testid={testId}
      aria-hidden
      className={cn("border-border bg-card flex flex-col gap-3 rounded-lg border p-4", className)}
    >
      <Skeleton className="h-4 w-1/2" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={`line-${index}`}
          className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
      <div className="mt-1 flex justify-end">
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  );
}

export type DetailSkeletonProps = Readonly<{
  sections?: number;
  className?: string;
}> &
  WithTestId;

/** Detail page — header + N sections of label/value pairs. */
export function DetailSkeleton({
  sections = 3,
  className,
  "data-testid": testId,
}: DetailSkeletonProps) {
  return (
    <div
      data-slot="detail-skeleton"
      data-testid={testId}
      aria-hidden
      className={cn("flex flex-col gap-6", className)}
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-3 w-48" />
      </div>
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <div
          key={`section-${sectionIndex}`}
          className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
        >
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, cellIndex) => (
              <div key={`cell-${sectionIndex}-${cellIndex}`} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export type StatsSkeletonProps = Readonly<{
  cards?: number;
  className?: string;
}> &
  WithTestId;

/** KPI-card-row placeholder. */
export function StatsSkeleton({ cards = 4, className, "data-testid": testId }: StatsSkeletonProps) {
  return (
    <div
      data-slot="stats-skeleton"
      data-testid={testId}
      aria-hidden
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}
    >
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={`kpi-${index}`}
          className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
