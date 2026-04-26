"use client";
import { ErrorState } from "@/components/ui/error-state";
export default function Error({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <ErrorState error={error} reset={reset} title="Waste declaration unavailable" description="Couldn't load the disposal form." data-testid="disposals-error" />;
}
