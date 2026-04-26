import { TableSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/** `/management/hr` loading skeleton — page header + KPI row + filter bar + table. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Filter bar */}
      <Skeleton className="h-10 w-full rounded-lg" />
      {/* Table */}
      <TableSkeleton rows={8} data-testid="hr-staff-table-skeleton" />
    </div>
  );
}
