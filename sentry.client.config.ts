/**
 * Sentry browser SDK — loaded on every client navigation.
 *
 * Web Vitals (LCP / CLS / INP / FID / TTFB) are captured automatically by
 * `browserTracingIntegration()` — no custom `useReportWebVitals` hook needed.
 * Session Replay is enabled at 10% sampling in production (100% on error) to
 * keep storage cost bounded while preserving every incident for triage.
 *
 * Errors during SSR hydration arrive here because Sentry boots before React.
 * A `useEffect`-based init inside a provider (the prior pattern) would miss
 * them.
 *
 * PII: `sendDefaultPii: false` — CLAUDE.md §2 classifies user PII as
 * `restricted`. Replay masks all text + blocks all media by default; per-
 * component opt-in via `data-sentry-unmask` when a specific surface is
 * verified safe to record verbatim.
 *
 * DSN via `NEXT_PUBLIC_SENTRY_DSN`. When unset, SDK initializes with
 * undefined DSN and drops events silently — never throws in dev/test.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const env = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
const isProd = env === "production";

Sentry.init({
  dsn,
  environment: env,
  sendDefaultPii: false,

  // Performance monitoring — 10% of transactions in prod, all in dev.
  tracesSampleRate: isProd ? 0.1 : 1.0,

  // Session Replay — 10% of sessions in prod, 100% of sessions that error.
  replaysSessionSampleRate: isProd ? 0.1 : 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Noise floor — benign errors that would otherwise drown real signal.
  ignoreErrors: [
    "top.GLOBALS",
    "ResizeObserver loop completed with undelivered notifications.",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
});
