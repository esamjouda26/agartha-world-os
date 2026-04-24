import { StatsSkeleton } from "@/components/ui/skeleton-kit";
import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/admin/it` loading skeleton — matches the System Dashboard layout:
 * KPI row (4 cards) + 2-column content (alert feed + chart/sparkline).
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* Page header skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* KPI row */}
      <StatsSkeleton cards={4} data-testid="it-dashboard-kpis-skeleton" />

      {/* 2-column content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alert feed skeleton */}
        <CardSkeleton lines={8} data-testid="it-alert-feed-skeleton" />

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <CardSkeleton lines={4} data-testid="it-device-chart-skeleton" />
          <CardSkeleton lines={2} data-testid="it-response-time-skeleton" />
        </div>
      </div>
    </div>
  );
}
