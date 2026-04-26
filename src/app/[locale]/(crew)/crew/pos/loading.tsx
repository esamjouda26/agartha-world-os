import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrewPosLoading() {
  return (
    <div className="flex h-full flex-col" data-testid="pos-loading">
      <div className="shrink-0 border-b border-border bg-background px-4 py-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-1 h-3 w-28" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <Skeleton className="mb-4 h-4 w-28" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
