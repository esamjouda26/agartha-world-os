"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewLeaveError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Leave unavailable"
      description="We couldn't load your leave data. Try again, or contact HR if the problem persists."
      data-testid="leave-error"
    />
  );
}
