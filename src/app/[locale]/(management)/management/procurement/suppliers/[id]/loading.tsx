import { Skeleton } from "@/components/ui/skeleton";

/** `/management/procurement/suppliers/[id]` loading skeleton. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Skeleton className="h-4 w-64" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}
