import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";

export default function OperationsVehiclesLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="vehicles-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-3 w-72" />
      </div>
      <StatsSkeleton cards={3} data-testid="vehicles-loading-kpis" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <TableSkeleton rows={6} cols={5} data-testid="vehicles-loading-table" />
    </div>
  );
}
