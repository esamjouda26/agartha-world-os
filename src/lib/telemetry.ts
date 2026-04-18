import { env } from "@/lib/env";

export async function initSentry(): Promise<void> {
  if (!env.SENTRY_DSN) {
    if (env.NODE_ENV !== "production") {
      console.info("[telemetry] SENTRY_DSN unset — Sentry disabled.");
    }
    return;
  }

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}

export async function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  if (!env.SENTRY_DSN) {
    console.error("[telemetry] captureException:", error, context);
    return;
  }
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
