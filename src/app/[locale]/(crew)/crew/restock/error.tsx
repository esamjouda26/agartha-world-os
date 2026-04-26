"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewRestockError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Restock unavailable"
      description="We couldn't load the restock form. Please try again."
      data-testid="restock-error"
    />
  );
}
