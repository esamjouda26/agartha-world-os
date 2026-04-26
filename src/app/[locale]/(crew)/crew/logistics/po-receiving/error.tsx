"use client";
import { ErrorState } from "@/components/ui/error-state";
export default function Error({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <ErrorState error={error} reset={reset} title="PO Receiving unavailable" description="Couldn't load purchase orders. Please try again." data-testid="po-receiving-error" />;
}
