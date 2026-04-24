import { StatsSkeleton, TableSkeleton, CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/** `/admin/system-health` loading skeleton — header + KPIs + table + zone card. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <StatsSkeleton cards={5} data-testid="health-kpi-skeleton" />
      <TableSkeleton rows={8} data-testid="heartbeat-table-skeleton" />
      <CardSkeleton lines={6} data-testid="zone-telemetry-skeleton" />
    </div>
  );
}
