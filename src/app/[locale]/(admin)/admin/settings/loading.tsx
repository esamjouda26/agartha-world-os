import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/ui/skeleton-kit";

export default function AdminSettingsLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="settings-loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-72" />
      </div>
      <CardSkeleton lines={3} data-testid="settings-loading-profile" />
      <CardSkeleton lines={3} data-testid="settings-loading-avatar" />
      <CardSkeleton lines={2} data-testid="settings-loading-theme" />
    </div>
  );
}
