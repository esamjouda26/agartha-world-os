"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function OperationsSchedulerError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Scheduler unavailable"
      description="We couldn't load the operational timeline. Try again, or contact IT."
      data-testid="scheduler-error"
    />
  );
}
