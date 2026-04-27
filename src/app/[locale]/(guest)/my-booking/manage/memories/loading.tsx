import { Skeleton } from "@/components/ui/skeleton";

export default function MemoriesLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6"
      data-testid="memories-loading"
    >
      <header className="flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-full max-w-prose" />
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <li
            key={idx}
            aria-hidden
            className="border-border-subtle bg-card flex flex-col overflow-hidden rounded-xl border"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
              <div className="border-border-subtle flex items-center justify-between gap-2 border-t pt-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
