/**
 * Sentry Node SDK — loaded on every server request (Node runtime).
 *
 * Server Actions, RSC rendering, and Route Handlers report here. Edge
 * runtime errors are captured by `sentry.edge.config.ts` (different SDK
 * surface — subset of Node APIs available on Vercel Edge).
 *
 * PII: `sendDefaultPii: false` — CLAUDE.md §2 classifies user PII as
 * `restricted`. We scrub cookies/headers/query strings by default; explicit
 * `extra` context on capture sites attaches only fields we've vetted.
 *
 * DSN resolution:
 *   - Prefer server-only `SENTRY_DSN` when present (allows a separate
 *     project than the client bundle).
 *   - Fall back to `NEXT_PUBLIC_SENTRY_DSN` so a single project covers
 *     both surfaces out of the box.
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
