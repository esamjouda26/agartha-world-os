import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrewScheduleLoading() {
  return (
    <div className="flex h-full flex-col" data-testid="schedule-loading">
      <div className="shrink-0 border-b border-border bg-background px-4 py-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-1 h-3 w-44" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-6">
          {/* Week navigation skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-11 w-11 rounded-md" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-11 w-11 rounded-md" />
          </div>
          {/* 7-day grid skeleton */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <CardSkeleton key={`day-skeleton-${index}`} lines={2} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
