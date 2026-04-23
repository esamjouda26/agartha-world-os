import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, StatsSkeleton } from "@/components/ui/skeleton-kit";

export default function ManagementStaffingLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="staffing-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-3 w-96" />
      </div>
      <StatsSkeleton cards={3} data-testid="staffing-loading-kpis" />
      <CardSkeleton lines={2} data-testid="staffing-loading-filters" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
      </div>
    </div>
  );
}
