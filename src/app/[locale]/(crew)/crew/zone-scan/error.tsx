"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewZoneScanError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Zone scan unavailable"
      description="Couldn't load zone information."
      data-testid="zone-scan-error"
    />
  );
}
