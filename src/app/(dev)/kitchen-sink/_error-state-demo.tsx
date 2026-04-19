"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

/**
 * Error-state demo — gated by a button so the primitive's `captureException`
 * side effect only fires when the reviewer chooses to exercise it. Mounting
 * the ErrorState on every page load would spam the dev console (and Sentry
 * in non-local environments) with a synthetic "demo failure" entry.
 *
 * Clicking "Trigger error" renders the real primitive with a fresh Error;
 * clicking "Reset" returns to the placeholder. Each trigger increments the
 * key so the `useEffect` reporter fires exactly once per demo instance.
 */
export function ErrorStateDemo() {
  const [nonce, setNonce] = React.useState<number | null>(null);

  if (nonce === null) {
    return (
      <EmptyState
        variant="error"
        title="Error state preview"
        description={
          <span>
            Click below to mount the live <code>ErrorState</code>. On mount it invokes{" "}
            <code>captureException</code> — when SENTRY_DSN is unset (local dev), the call falls
            through to <code>console.error</code> by design.
          </span>
        }
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNonce(0)}
            data-testid="kitchen-sink-error-trigger"
          >
            Trigger error
          </Button>
        }
      />
    );
  }

  const error = (() => {
    const err = new Error("Demo failure — this is a synthetic error for the kitchen sink.");
    (err as Error & { digest?: string }).digest = `demo-${nonce}`;
    return err;
  })();

  return (
    <div className="flex flex-col gap-3">
      <ErrorState
        key={nonce}
        error={error}
        reset={() => setNonce((n) => (n ?? 0) + 1)}
        title="A request failed."
        description={
          <span>
            This is the canonical ErrorState primitive every route-level{" "}
            <code className="font-mono text-xs">error.tsx</code> composes.
          </span>
        }
        data-testid="kitchen-sink-error-state"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setNonce(null)}
        className="self-start"
        data-testid="kitchen-sink-error-reset"
      >
        Reset to placeholder
      </Button>
    </div>
  );
}
