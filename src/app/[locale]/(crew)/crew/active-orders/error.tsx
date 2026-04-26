"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewActiveOrdersError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="KDS unavailable"
      description="We couldn't load the active orders display. Please try again."
      data-testid="kds-error"
    />
  );
}
