"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function SurveyError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <ErrorState
        error={error}
        reset={reset}
        title="Survey hit a snag."
        description="The page failed to render. We've reported the issue — please retry."
        data-testid="survey-error"
      />
    </div>
  );
}
