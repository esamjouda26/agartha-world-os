"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CrewRestockQueueError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState error={error} reset={reset} title="Restock queue unavailable" description="Couldn't load the restock queue. Please try again." data-testid="restock-queue-error" />
  );
}
