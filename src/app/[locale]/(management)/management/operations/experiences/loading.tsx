import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/skeleton-kit";

export default function OperationsExperiencesLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="experiences-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-3 w-80" />
      </div>
      <Skeleton className="h-10 w-72" />
      <TableSkeleton rows={6} cols={5} data-testid="experiences-loading-table" />
    </div>
  );
}
