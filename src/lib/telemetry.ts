/**
 * Telemetry — isomorphic Sentry wrapper.
 *
 * Must NOT import `@/lib/env` because that module is server-only and
 * `src/components/ui/error-state.tsx` (a Client Component per the Next App
 * Router `error.tsx` convention) depends on this file. Reads the raw
 * `process.env` keys directly instead — the `NEXT_PUBLIC_` prefix is what
 * makes the client read possible; Phase 3 completes the Sentry wiring.
 */

type TelemetryContext = Record<string, unknown>;

function getDsn(): string | undefined {
  // On the server, both keys are available; on the client only NEXT_PUBLIC_ is
  // inlined at build time. Prefer the server-side key when present.
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
}

function getEnvName(): string {
  return process.env.NODE_ENV ?? "development";
}

export async function initSentry(): Promise<void> {
  const dsn = getDsn();
  if (!dsn) {
    if (getEnvName() !== "production") {
      console.info("[telemetry] SENTRY_DSN unset — Sentry disabled.");
    }
    return;
  }

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    environment: getEnvName(),
    tracesSampleRate: getEnvName() === "production" ? 0.1 : 1.0,
  });
}

export async function captureException(error: unknown, context?: TelemetryContext): Promise<void> {
  const dsn = getDsn();
  if (!dsn) {
    // In tests and local dev with no DSN, surface to the console so we don't
    // silently swallow errors. Keep context terse to avoid PII in logs.
    console.error("[telemetry] captureException:", error, context);
    return;
  }
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
