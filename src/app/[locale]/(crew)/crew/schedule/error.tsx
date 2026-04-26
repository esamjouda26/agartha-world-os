"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewScheduleError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Schedule unavailable"
      description="We couldn't load your schedule. Try again, or contact HR if the problem persists."
      data-testid="schedule-error"
    />
  );
}
