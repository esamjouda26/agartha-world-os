"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function MaterialDetailError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Material detail is temporarily unavailable"
      description="We couldn't load this material's detail page. Try again, or contact procurement ops if the problem persists."
      data-testid="procurement-material-detail-error"
    />
  );
}
