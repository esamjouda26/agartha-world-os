import { Skeleton } from "@/components/ui/skeleton";

/** `/management/procurement/suppliers` loading skeleton. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      {/* Filter bar */}
      <Skeleton className="h-10 rounded-lg" />
      {/* Table */}
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
