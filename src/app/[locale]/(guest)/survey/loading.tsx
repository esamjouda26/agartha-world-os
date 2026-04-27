import { Skeleton } from "@/components/ui/skeleton";

export default function SurveyLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12"
      data-testid="survey-loading"
    >
      <header className="flex flex-col items-center gap-3 text-center">
        <Skeleton className="size-14 rounded-2xl" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
      </header>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          aria-hidden
          className="border-border-subtle bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:p-6"
        >
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}
