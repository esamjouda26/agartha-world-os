import { TableSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/** `/management/hr/shifts` loading skeleton — header + KPIs + tabs + table. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-80 rounded-lg" />
      <TableSkeleton rows={8} data-testid="hr-shifts-table-skeleton" />
    </div>
  );
}
