import { TableSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/** `/admin/permissions` loading skeleton — page header + tab strip + content. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-36 rounded-md" />
        ))}
      </div>
      <TableSkeleton rows={8} data-testid="permissions-skeleton" />
    </div>
  );
}
