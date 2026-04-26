import { Skeleton } from "@/components/ui/skeleton";

/** `/management/procurement/purchase-orders/[id]` loading skeleton. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-64" />
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-72" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Contact card */}
      <Skeleton className="h-20 rounded-xl" />
      {/* Line items card */}
      <Skeleton className="h-64 rounded-xl" />
      {/* Receiving history */}
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
