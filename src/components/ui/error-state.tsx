"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { captureException } from "@/lib/telemetry";

/**
 * ErrorState — prompt.md §2B-D.8.
 *
 * Designed to be the default content of route-level `error.tsx` files. It
 * forwards the error to Sentry on mount via `src/lib/telemetry.ts` (CLAUDE.md
 * §12, prompt.md rule 8 pipeline-step-8) and exposes a `reset` CTA that
 * re-invokes the failed render tree.
 */

export type ErrorStateProps = Readonly<{
  error: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}>;

export function ErrorState({
  error,
  reset,
  title = "Something went wrong.",
  description,
  className,
  "data-testid": testId,
}: ErrorStateProps) {
  React.useEffect(() => {
    captureException(error, error.digest ? { digest: error.digest } : undefined);
  }, [error]);

  return (
    <EmptyState
      variant="error"
      title={title}
      description={
        description ??
        "The page failed to render. The error has been reported; try again or contact support if the issue persists."
      }
      action={
        reset ? (
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            data-testid={testId ? `${testId}-retry` : "error-state-retry"}
          >
            <RotateCcw aria-hidden className="size-4" />
            Retry
          </Button>
        ) : null
      }
      className={cn(className)}
      data-testid={testId ?? "error-state"}
    />
  );
}
