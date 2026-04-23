"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewIncidentsError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Incidents are temporarily unavailable"
      description="We couldn't load your reports. Try again, or contact IT if the problem persists."
      data-testid="incidents-error"
    />
  );
}
