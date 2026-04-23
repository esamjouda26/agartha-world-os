"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ManagementAuditError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Audit log is temporarily unavailable"
      description="We couldn't load the audit trail. Try again, or contact IT if the problem persists."
      data-testid="audit-error"
    />
  );
}
