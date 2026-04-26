"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function MaintenanceDeviceTopologyError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Device topology is temporarily unavailable"
      description="We couldn't load the device tree. Try again, or contact IT if the problem persists."
      data-testid="maintenance-device-topology-error"
    />
  );
}
