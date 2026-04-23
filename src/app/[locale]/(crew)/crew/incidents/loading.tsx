import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";

export default function CrewIncidentsLoading() {
  return (
    <div className="flex flex-col gap-5" data-testid="incidents-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-60" />
      </div>
      <CardSkeleton lines={1} data-testid="incidents-loading-summary" />
      <TableSkeleton rows={4} cols={4} data-testid="incidents-loading-table" />
    </div>
  );
}
