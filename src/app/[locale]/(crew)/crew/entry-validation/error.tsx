"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewEntryValidationError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Entry validation unavailable"
      description="We couldn't load the ticket scanner. Please try again."
      data-testid="entry-validation-error"
    />
  );
}
