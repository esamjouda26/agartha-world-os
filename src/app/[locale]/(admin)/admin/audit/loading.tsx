import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton-kit";

export default function AdminAuditLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="audit-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-80" />
      </div>
      <CardSkeleton lines={4} data-testid="audit-loading-filters" />
      <TableSkeleton rows={8} cols={6} data-testid="audit-loading-table" />
    </div>
  );
}
