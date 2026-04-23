"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ManagementReportsError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Reports are temporarily unavailable"
      description="We couldn't load your report configs. Try again, or contact IT if the problem persists."
      data-testid="reports-error"
    />
  );
}
