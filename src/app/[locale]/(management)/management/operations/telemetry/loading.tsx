import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton } from "@/components/ui/skeleton-kit";

export default function OperationsTelemetryLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="telemetry-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3 w-80" />
      </div>
      <StatsSkeleton cards={3} data-testid="telemetry-loading-kpis" />
      {/* Location group skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
