import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/ui/skeleton-kit";

/**
 * /book/payment loading skeleton — matches the split-view layout (status
 * panel + summary aside) so above-the-fold shapes don't shift on hydration.
 */
export default function BookPaymentLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-32 sm:px-6 md:pb-12 lg:flex-row lg:items-start lg:gap-10"
      data-testid="book-payment-loading"
    >
      <div className="flex-1 lg:max-w-2xl xl:max-w-3xl">
        <header className="mb-6 flex flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-2/3" />
        </header>
        <div
          aria-hidden
          className="border-border-subtle bg-card flex flex-col items-center gap-6 rounded-2xl border p-6 sm:p-10"
        >
          <Skeleton className="size-16 rounded-2xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-12 w-full max-w-sm rounded-md" />
          <div className="flex w-full max-w-md justify-between gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="lg:sticky lg:top-24 lg:w-[22rem] lg:shrink-0">
        <CardSkeleton lines={5} />
      </div>
    </div>
  );
}
