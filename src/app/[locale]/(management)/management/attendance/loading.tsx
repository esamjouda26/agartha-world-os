import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";

/** `/management/attendance` loading skeleton — mirrors the admin / crew attendance skeletons. */
export default function ManagementAttendanceLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="attendance-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-10 w-full max-w-sm" />
      <StatsSkeleton cards={4} data-testid="attendance-loading-stats" />
      <TableSkeleton rows={4} cols={3} data-testid="attendance-loading-table" />
    </div>
  );
}
