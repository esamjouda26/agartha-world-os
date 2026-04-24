import { CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/admin/iam/[id]` loading skeleton — matches the detail layout:
 * Header + staff card + request card + timeline card.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* Breadcrumb + header skeleton */}
      <div className="border-border-subtle flex flex-col gap-4 border-b pb-6">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-20" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Cards */}
      <CardSkeleton lines={4} data-testid="iam-detail-staff-skeleton" />
      <CardSkeleton lines={4} data-testid="iam-detail-request-skeleton" />
      <CardSkeleton lines={3} data-testid="iam-detail-timeline-skeleton" />
    </div>
  );
}
