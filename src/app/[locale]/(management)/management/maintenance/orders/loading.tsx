import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";

export default function MaintenanceOrdersLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <StatsSkeleton cards={4} data-testid="maintenance-orders-loading-kpi" />
      <Skeleton className="h-12 w-full rounded-full" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <TableSkeleton
        rows={6}
        cols={5}
        data-testid="maintenance-orders-loading-table"
      />
    </div>
  );
}
