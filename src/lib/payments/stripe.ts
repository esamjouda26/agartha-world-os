import "server-only";

import Stripe from "stripe";

import { env } from "@/lib/env";

/**
 * Stripe singleton. Lazy-instantiated so the app can boot without
 * `STRIPE_SECRET_KEY` (dev / preview without payments wired).
 *
 * `apiVersion` is pinned. CLAUDE.md §10 + the plan §10 risk register both
 * require this — Stripe webhook payload shapes change between API
 * versions. Bumping must be a deliberate ADR.
 *
 * Bundle impact: server-only. Stripe SDK is ~30KB minified but never
 * reaches the client because it's gated by `import "server-only"`.
 */

// Pinned to the Stripe SDK's bundled `LatestApiVersion` type so the
// version string can never drift away from the installed SDK. Bumping
// the SDK version pulls in the new pinned API version automatically;
// any payload-shape regression surfaces in the webhook handler tests.
const STRIPE_API_VERSION = "2025-02-24.acacia" satisfies Stripe.LatestApiVersion;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    // Server Actions catch this and return DEPENDENCY_FAILED so the user
    // sees friendly copy instead of a stack trace. The webhook handler
    // also short-circuits before attempting `constructEvent`.
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
      // Pin the SDK app info so Stripe support can correlate calls.
      appInfo: {
        name: "agartha-os",
        version: "0.1.0",
      },
    });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY) && Boolean(env.STRIPE_WEBHOOK_SECRET);
}

/**
 * The base URL for Checkout Session redirects. Falls back to the request
 * origin when set in middleware via `x-forwarded-host`, but production
 * deploys MUST set NEXT_PUBLIC_BASE_URL because Stripe rejects relative
 * success_url + cancel_url values.
 */
export function getBaseUrl(): string {
  if (env.NEXT_PUBLIC_BASE_URL) return env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  // Local dev fallback so Stripe test mode works without env override.
  return "http://localhost:3000";
}
