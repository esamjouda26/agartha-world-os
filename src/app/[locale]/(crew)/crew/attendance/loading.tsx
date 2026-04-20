import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";

/**
 * Attendance loading state — prompt.md rule 11 requires `loading.tsx` to
 * compose Phase 2B skeleton primitives. This file pulls in
 * `<StatsSkeleton>` (matching the Tab-3 KPI grid) and `<TableSkeleton>`
 * (matching the Tab-2 exception list layout).
 */
export default function CrewAttendanceLoading() {
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
