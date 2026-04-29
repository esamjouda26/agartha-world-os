"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ReorderDashboardError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Reorder dashboard is temporarily unavailable"
      description="We couldn't load the reorder dashboard. Try again, or contact procurement ops if the problem persists."
      data-testid="procurement-reorder-error"
    />
  );
}
