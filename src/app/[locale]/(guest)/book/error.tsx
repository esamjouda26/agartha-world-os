"use client";

import { ErrorState } from "@/components/ui/error-state";

/**
 * /book error boundary — Sentry capture happens inside <ErrorState>'s
 * useEffect (Infrastructure Contract item #8 — captureException is called
 * from the shared error-state primitive, not duplicated here).
 */
export default function BookError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <ErrorState
        error={error}
        reset={reset}
        title="Bookings hit a snag."
        description="The page failed to render. We've reported the issue — please retry, or pop back later."
        data-testid="book-error"
      />
    </div>
  );
}
