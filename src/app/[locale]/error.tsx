"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function Error({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <ErrorState error={error} reset={reset} />
    </div>
  );
}
