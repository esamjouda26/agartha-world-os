import { Skeleton } from "@/components/ui/skeleton";

export default function ManageLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6"
      data-testid="manage-loading"
    >
      {/* Ticket hero skeleton — mirrors the QR + facts split layout. */}
      <div
        aria-hidden
        className="border-border-subtle bg-card flex flex-col overflow-hidden rounded-2xl border lg:flex-row"
      >
        <div className="flex shrink-0 items-center justify-center bg-white p-6 sm:p-8 lg:max-w-[22rem] lg:min-w-[20rem]">
          <Skeleton className="size-[260px] rounded-md" />
        </div>
        <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
          <div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-2 h-8 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
          <div className="border-border-subtle border-t pt-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-5 w-1/2" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Action shelf skeleton */}
      <div className="flex gap-2" aria-hidden>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Perks card */}
      <div
        aria-hidden
        className="border-border-subtle bg-card flex flex-col gap-3 rounded-xl border p-5"
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      {/* Attendees */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={idx}
            aria-hidden
            className="border-border-subtle bg-card flex flex-col gap-3 rounded-xl border p-4"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-7 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
