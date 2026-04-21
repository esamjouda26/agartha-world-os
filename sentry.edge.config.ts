/**
 * Sentry Edge SDK — loaded on every Edge runtime invocation.
 *
 * The Edge runtime is a trimmed subset of Node — Sentry exposes a separate
 * SDK build that avoids Node-only APIs (fs, child_process). Covers
 * `middleware.ts` + any route handlers with `export const runtime = "edge"`.
 *
 * Note: this config runs locally too (Next spins up the Edge runtime in
 * dev). It is NOT the same as the Vercel-Edge deployment boundary.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
const isProd = env === "production";

Sentry.init({
  dsn,
  environment: env,
  sendDefaultPii: false,
  tracesSampleRate: isProd ? 0.1 : 1.0,
});
