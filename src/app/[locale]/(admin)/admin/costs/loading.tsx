import { StatsSkeleton, CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <StatsSkeleton cards={3} data-testid="costs-kpi-skeleton" />
      <CardSkeleton lines={3} data-testid="waste-cogs-skeleton" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CardSkeleton lines={8} />
        <CardSkeleton lines={8} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>
    </div>
  );
}
