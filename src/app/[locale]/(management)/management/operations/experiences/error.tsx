"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function OperationsExperiencesError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Experience config unavailable"
      description="We couldn't load experience configuration. Try again, or contact IT if the problem persists."
      data-testid="experiences-error"
    />
  );
}
