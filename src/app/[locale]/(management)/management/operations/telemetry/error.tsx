"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function OperationsTelemetryError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Telemetry data unavailable"
      description="We couldn't load zone telemetry. Try again, or contact IT if the problem persists."
      data-testid="telemetry-error"
    />
  );
}
