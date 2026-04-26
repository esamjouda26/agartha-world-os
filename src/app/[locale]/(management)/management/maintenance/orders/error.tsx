"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function MaintenanceOrdersError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Work orders are temporarily unavailable"
      description="We couldn't load the maintenance work order queue. Try again, or contact IT if the problem persists."
      data-testid="maintenance-orders-error"
    />
  );
}
