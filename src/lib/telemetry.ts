/**
 * Telemetry — thin `captureException` shim over `@sentry/nextjs`.
 *
 * Sentry's actual init happens in the runtime-specific config files at repo
 * root (`sentry.client.config.ts` / `sentry.server.config.ts` /
 * `sentry.edge.config.ts`) + `instrumentation.ts`. Nothing boots here — this
 * module exists only to normalize `captureException(err, ctx)` call shape
 * across client + server features without every caller depending on the
 * Sentry SDK directly.
 *
 * Safe to import from both server and client code: `@sentry/nextjs`
 * re-exports to whichever runtime is active.
 */
import * as Sentry from "@sentry/nextjs";

type TelemetryContext = Record<string, unknown>;

export function captureException(error: unknown, context?: TelemetryContext): void {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
