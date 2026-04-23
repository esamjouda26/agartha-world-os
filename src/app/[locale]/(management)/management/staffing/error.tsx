"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ManagementStaffingError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Staffing view is temporarily unavailable"
      description="We couldn't load today's crew. Try again, or contact IT if the problem persists."
      data-testid="staffing-error"
    />
  );
}
