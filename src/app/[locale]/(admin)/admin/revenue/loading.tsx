import { StatsSkeleton, CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <StatsSkeleton cards={5} data-testid="revenue-kpi-skeleton" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CardSkeleton lines={8} />
        <CardSkeleton lines={8} />
      </div>
      <CardSkeleton lines={4} data-testid="revenue-trend-skeleton" />
      <CardSkeleton lines={4} data-testid="slot-util-skeleton" />
    </div>
  );
}
