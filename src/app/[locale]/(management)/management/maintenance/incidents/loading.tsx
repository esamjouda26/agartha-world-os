import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";

export default function MaintenanceIncidentsLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="incidents-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3 w-80" />
      </div>
      <StatsSkeleton cards={2} data-testid="incidents-loading-kpi" />
      <Skeleton className="h-10 w-72" />
      <TableSkeleton rows={6} cols={5} data-testid="incidents-loading-table" />
    </div>
  );
}
