"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AdminAttendanceError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Attendance is temporarily unavailable"
      description="We couldn't load the attendance dashboard. Try again, or contact support if the problem persists."
      data-testid="attendance-error"
    />
  );
}
