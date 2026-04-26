"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewPosError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="POS Terminal unavailable"
      description="We couldn't load the POS catalog. Please try again or contact your manager."
      data-testid="pos-error"
    />
  );
}
