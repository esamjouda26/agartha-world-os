/**
 * Next.js instrumentation entry — runs once per server process boot.
 *
 * Delegates to the runtime-specific Sentry config files at repo root:
 *   - Node runtime  → `sentry.server.config.ts`
 *   - Edge runtime  → `sentry.edge.config.ts`
 *
 * The browser SDK boots from `sentry.client.config.ts` on its own (Next's
 * app-router bundler loads it into the first client chunk automatically).
 *
 * `onRequestError` forwards every caught request error to Sentry so RSC
 * errors + Server Action failures are captured without bespoke try/catch
 * wrappers at every call site.
 */
import * as Sentry from "@sentry/nextjs";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
