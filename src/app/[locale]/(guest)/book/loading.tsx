import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton, CardSkeleton } from "@/components/ui/skeleton-kit";

/**
 * /book loading skeleton — matches the wizard's final two-column layout
 * (header → progress bar → step card → summary aside) so above-the-fold
 * shapes don't shift when data arrives.
 */
export default function BookLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-32 sm:px-6 md:pb-12 lg:flex-row lg:items-start lg:gap-10"
      data-testid="book-loading"
    >
      <div className="flex-1 lg:max-w-2xl xl:max-w-3xl">
        <header className="mb-6 flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full max-w-md" />
        </header>
        <div className="mb-6 flex items-center gap-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-8 flex-1 rounded-md" />
          ))}
        </div>
        <div
          aria-hidden
          className="border-border-subtle bg-card flex flex-col gap-4 rounded-xl border p-5"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <FormSkeleton fields={3} submit={false} />
        </div>
      </div>
      <div className="lg:sticky lg:top-24 lg:w-[22rem] lg:shrink-0">
        <CardSkeleton lines={5} />
      </div>
    </div>
  );
}
