"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function MyBookingError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-12 sm:px-6">
      <ErrorState
        error={error}
        reset={reset}
        title="Booking lookup hit a snag."
        description="The page failed to render. We've reported the issue — please retry."
        data-testid="my-booking-error"
      />
    </div>
  );
}
