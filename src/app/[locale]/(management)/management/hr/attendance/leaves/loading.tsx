import { TableSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-96 rounded-lg" />
      <TableSkeleton rows={8} data-testid="hr-leaves-table-skeleton" />
    </div>
  );
}
