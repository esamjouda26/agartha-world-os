import { FormSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrewDisposalsLoading() {
  return (
    <div className="flex h-full flex-col" data-testid="disposals-loading">
      <div className="shrink-0 border-b border-border bg-background px-4 py-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-1 h-3 w-44" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <FormSkeleton fields={5} />
      </div>
    </div>
  );
}
