import { TableSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/** `/admin/zones` loading skeleton — page header + tab strip + table. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      {/* Tab strip */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-md" />
        ))}
      </div>
      <TableSkeleton rows={6} data-testid="zones-table-skeleton" />
    </div>
  );
}
