"use client";

import { ErrorState } from "@/components/ui/error-state";

/**
 * Attendance error boundary — CLAUDE.md §3 + prompt.md "Error boundaries
 * report to Sentry". `<ErrorState>` handles `captureException(error)` on
 * mount via `src/lib/telemetry.ts`.
 */
export default function CrewAttendanceError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Attendance is temporarily unavailable"
      description="We couldn't load your attendance dashboard. Try again, or contact HR if the problem persists."
      data-testid="attendance-error"
    />
  );
}
