import { Skeleton } from "@/components/ui/skeleton";

export default function MyBookingLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12 sm:px-6"
      data-testid="my-booking-loading"
    >
      <header className="flex flex-col items-center gap-3 text-center">
        <Skeleton className="size-14 rounded-2xl" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </header>
      <div
        aria-hidden
        className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5"
      >
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}
