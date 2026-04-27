import { Skeleton } from "@/components/ui/skeleton";

export default function BiometricsLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6"
      data-testid="biometrics-loading"
    >
      <header className="flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
      </header>

      {/* Disclosure skeleton — six fact tiles in a 2-col grid. */}
      <div
        aria-hidden
        className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>

      {/* Attendee cards */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={idx}
            aria-hidden
            className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
