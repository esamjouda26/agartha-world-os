import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";

export default function AdminReportsLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="reports-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-96" />
      </div>
      <CardSkeleton lines={4} data-testid="reports-loading-generator" />
      <CardSkeleton lines={3} data-testid="reports-loading-schedules" />
      <TableSkeleton rows={5} cols={6} data-testid="reports-loading-history" />
    </div>
  );
}
