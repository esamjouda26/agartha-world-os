import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/ui/skeleton-kit";

export default function ManagementAnnouncementsLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="announcements-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3 w-80" />
      </div>
      <Skeleton className="h-10 w-72" />
      <CardSkeleton lines={3} data-testid="announcements-loading-card-1" />
      <CardSkeleton lines={3} data-testid="announcements-loading-card-2" />
      <CardSkeleton lines={3} data-testid="announcements-loading-card-3" />
    </div>
  );
}
