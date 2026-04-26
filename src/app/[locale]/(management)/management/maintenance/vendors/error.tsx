"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function MaintenanceVendorsError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Vendor registry is temporarily unavailable"
      description="We couldn't load the maintenance vendor registry. Try again, or contact IT if the problem persists."
      data-testid="maintenance-vendors-error"
    />
  );
}
