import { FormSkeleton, StatsSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrewLeaveLoading() {
  return (
    <div className="flex h-full flex-col" data-testid="leave-loading">
      <div className="border-border bg-background shrink-0 border-b px-4 py-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-1 h-3 w-44" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-8">
          {/* Balances section skeleton */}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-36" />
            <StatsSkeleton cards={3} data-testid="leave-loading-balances" />
          </div>

          <Skeleton className="h-px w-full" />

          {/* New request form skeleton */}
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-28" />
            <div className="border-border bg-card max-w-2xl rounded-xl border p-6">
              <FormSkeleton fields={5} submit data-testid="leave-loading-form" />
            </div>
          </div>

          <Skeleton className="h-px w-full" />

          {/* Requests section skeleton */}
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-28" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`req-skel-${index}`}
                  className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                    <Skeleton className="h-9 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
