import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrewEntryValidationLoading() {
  return (
    <div className="flex h-full flex-col" data-testid="entry-validation-loading">
      <div className="shrink-0 border-b border-border bg-background px-4 py-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-1 h-3 w-52" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="mt-4">
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
