"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function OperationsVehiclesError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Vehicle fleet unavailable"
      description="We couldn't load the vehicle registry. Try again, or contact IT."
      data-testid="vehicles-error"
    />
  );
}
