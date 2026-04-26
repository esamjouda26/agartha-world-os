import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/skeleton-kit";

export default function OperationsSchedulerLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="scheduler-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <TableSkeleton rows={8} cols={5} data-testid="scheduler-loading-table" />
    </div>
  );
}
