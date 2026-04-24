import { StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/admin/devices` loading skeleton.
 * KPI row (4 tiles) + status tab chips + filterable data table.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      {/* KPI row */}
      <StatsSkeleton cards={4} data-testid="device-kpi-skeleton" />

      {/* Status tab chips */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={8} data-testid="device-table-skeleton" />
    </div>
  );
}
