import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <CardSkeleton lines={4} data-testid="business-revenue-skeleton" />
      <CardSkeleton lines={4} data-testid="business-ops-skeleton" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
      </div>
      <CardSkeleton lines={6} data-testid="business-trend-skeleton" />
    </div>
  );
}
