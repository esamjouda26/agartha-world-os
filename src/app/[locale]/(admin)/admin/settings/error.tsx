"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AdminSettingsError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Settings are temporarily unavailable"
      description="We couldn't load your profile. Try again, or contact IT if the problem persists."
      data-testid="settings-error"
    />
  );
}
