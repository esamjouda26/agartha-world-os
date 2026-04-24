import { StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/admin/iam` loading skeleton — matches the IAM Ledger layout:
 * KPI row (3 cards) + tab strip + search + table.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* Page header skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* KPI row */}
      <StatsSkeleton cards={3} data-testid="iam-kpis-skeleton" />

      {/* Tab strip + search */}
      <div className="border-border-subtle bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="border-border-subtle flex flex-col gap-3 border-b px-4 py-3">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-9 w-64" />
        </div>

        {/* Table skeleton */}
        <TableSkeleton rows={8} cols={7} />
      </div>
    </div>
  );
}
