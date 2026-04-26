import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrewActiveOrdersLoading() {
  return (
    <div className="flex h-full flex-col" data-testid="kds-loading">
      <div className="shrink-0 border-b border-border bg-background px-4 py-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-1 h-3 w-56" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
