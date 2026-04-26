import { TableSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/** `/management/pos` loading skeleton — page header + KPI row + filter bar + table. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Search bar */}
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
      {/* Table */}
      <TableSkeleton rows={8} data-testid="pos-points-table-skeleton" />
    </div>
  );
}
