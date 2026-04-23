"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function OperationsIncidentsError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Incidents are temporarily unavailable"
      description="We couldn't load the incident log. Try again, or contact IT if the problem persists."
      data-testid="incidents-error"
    />
  );
}
