"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function SetPasswordError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <ErrorState error={error} reset={reset} />;
}
