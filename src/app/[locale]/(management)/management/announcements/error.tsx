"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ManagementAnnouncementsError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Announcements are temporarily unavailable"
      description="We couldn't load your announcements. Try again, or contact IT if the problem persists."
      data-testid="announcements-error"
    />
  );
}
