import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * confirm-booking-payment — RETIRED.
 *
 * Replaced by the Stripe-native webhook handler at
 *   src/app/api/webhooks/stripe/route.ts
 * which performs Stripe `constructEvent` signature verification, the
 * `payment_webhook_events` idempotency ledger, and the
 * `payment_webhook_events_dlq` retry budget — none of which the legacy
 * shared-secret implementation here did.
 *
 * This file is retained ONLY so any pre-existing Stripe webhook
 * configuration that still points at this function URL (or any stale
 * operational tooling) gets a clean HTTP 410 Gone response with a
 * Location header pointing at the canonical webhook endpoint, instead
 * of silently 200-ing while doing nothing.
 *
 * Recommended ops follow-up — DELETE this function from the Supabase
 * project once you have confirmed:
 *   1. The Stripe Dashboard webhook destination is updated to
 *      `https://<your-domain>/api/webhooks/stripe`.
 *   2. No internal callers (CI scripts, monitoring synthetics, manual
 *      replay tooling) target this URL.
 *
 *   supabase functions delete confirm-booking-payment
 *
 * No request payload is read, no DB writes are performed, no envs are
 * required. The handler is intentionally side-effect free.
 */

const RETIRED_AT = "2026-04-27";
const REPLACEMENT_PATH = "/api/webhooks/stripe";

Deno.serve((req: Request) => {
  // CORS preflight tolerance for any operator hitting this from a
  // browser console while debugging.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
        "Access-Control-Allow-Headers":
          "authorization, content-type, stripe-signature, x-webhook-signature",
      },
    });
  }

  const url = new URL(req.url);
  const replacement = `${url.protocol}//${url.host}${REPLACEMENT_PATH}`;

  return new Response(
    JSON.stringify({
      error: "Gone",
      message:
        "This function has been retired. Configure the Stripe webhook to deliver events to /api/webhooks/stripe on the application origin.",
      replacement_url: replacement,
      retired_at: RETIRED_AT,
    }),
    {
      status: 410,
      headers: {
        "Content-Type": "application/json",
        Location: replacement,
        "Cache-Control": "no-store",
      },
    },
  );
});
