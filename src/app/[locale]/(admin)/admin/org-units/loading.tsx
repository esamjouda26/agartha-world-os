import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/ui/skeleton-kit";

/** `/admin/org-units` loading skeleton — page header + tree + side panel. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-6">
        <CardSkeleton lines={10} data-testid="org-unit-tree-skeleton" />
        <CardSkeleton lines={6} data-testid="org-unit-panel-skeleton" />
      </div>
    </div>
  );
}
