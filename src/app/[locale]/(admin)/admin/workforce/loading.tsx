import { StatsSkeleton, CardSkeleton } from "@/components/ui/skeleton-kit";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <StatsSkeleton cards={4} />
      <CardSkeleton lines={3} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CardSkeleton lines={7} />
        <CardSkeleton lines={5} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={6} />
      </div>
    </div>
  );
}
