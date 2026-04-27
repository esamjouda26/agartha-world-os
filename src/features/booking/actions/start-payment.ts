"use server";

import "server-only";

import { after } from "next/server";
import { cookies, headers } from "next/headers";

import { z } from "zod";

import { verifyGuestSameOrigin } from "@/lib/auth/guest-csrf";
import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { getBaseUrl, getStripe, isStripeConfigured } from "@/lib/payments/stripe";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { guestSpan } from "@/lib/telemetry-guest";

import { GUEST_BOOKING_REF_COOKIE } from "@/features/booking/constants";

/**
 * /book/payment "Continue to payment" CTA handler.
 *
 * Mints a Stripe Checkout Session and returns its hosted URL. The client
 * navigates the browser to it; on completion Stripe redirects back to
 * /book/payment with `?session_id=…` (or `?cancelled=1`). The webhook
 * delivers the authoritative event to /api/webhooks/stripe which flips
 * `bookings.status` → `confirmed` via `rpc_apply_payment_event`.
 *
 * SAQ-A scope: this server NEVER sees raw card data. The Hosted Checkout
 * page handles the entire card capture; we only orchestrate the redirect
 * and read back the resulting state.
 *
 * Idempotency: Stripe Checkout Session creation is naturally idempotent
 * via the `bookings.id` metadata — if a stale Session is still active
 * for this booking, hitting the CTA again creates a fresh Session
 * (acceptable; the old one is auto-expired by Stripe after 24h). To
 * prevent CTA spam we lean on the per-IP rate limit below.
 */

const inputSchema = z.object({
  booking_ref: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^AG-[A-F0-9]{6}-\d{4}$/, "Invalid booking reference"),
});
type StartPaymentInput = z.infer<typeof inputSchema>;

const limiter = createRateLimiter({
  tokens: 3,
  window: "60 s",
  prefix: "guest-start-payment",
});

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    "unknown"
  );
}

type StartPaymentSuccess = Readonly<{
  /** Stripe Hosted Checkout URL — the client navigates to it. */
  redirectUrl: string;
}>;

export async function startPaymentAction(
  input: StartPaymentInput,
): Promise<ServerActionResult<StartPaymentSuccess>> {
  return guestSpan(
    {
      name: "guest.payment.started",
      attributes: { booking_ref: input.booking_ref ?? "missing" },
    },
    async () => startPaymentActionImpl(input),
  );
}

async function startPaymentActionImpl(
  input: StartPaymentInput,
): Promise<ServerActionResult<StartPaymentSuccess>> {
  // 1. Validate.
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  // 1b. CSRF — same-origin check.
  if (!(await verifyGuestSameOrigin())) return fail("FORBIDDEN");

  // 2. Auth — anonymous; cookie-binding stands in. The cookie was set
  // by `createBookingAction` on a same-origin redirect.
  const store = await cookies();
  const cookieRef = store.get(GUEST_BOOKING_REF_COOKIE)?.value?.toUpperCase();
  if (!cookieRef || cookieRef !== parsed.data.booking_ref) {
    return fail("FORBIDDEN");
  }

  // 3. Rate-limit by IP (3/min — generous enough for re-tries; tight
  // enough that a stolen cookie can't spam Stripe Sessions).
  const ip = await clientIp();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Idempotency — see top-of-file note.

  // 5. Configuration guard. In dev/preview without Stripe wired,
  // surface a friendly DEPENDENCY_FAILED rather than throwing.
  if (!isStripeConfigured()) {
    after(async () => {
      loggerWith({ feature: "booking", event: "start_payment.unconfigured" }).warn(
        { booking_ref: parsed.data.booking_ref },
        "startPaymentAction hit but Stripe not configured",
      );
    });
    return fail("DEPENDENCY_FAILED", {
      form: "Payments aren't configured for this environment. Contact the team if you see this in production.",
    });
  }

  const supabase = createSupabaseServiceClient();

  // 6. Read the booking + tier (for the line-item label) + most recent
  // booking_payments row (the one we'll attach the payment_intent_id to).
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, total_price, booker_email, booker_name, status, tier_id")
    .ilike("booking_ref", parsed.data.booking_ref)
    .maybeSingle();

  if (!booking) return fail("NOT_FOUND");
  if (booking.status === "confirmed") {
    // Already paid — nothing to do; UI should reflect this, but if the
    // user gets here via a stale CTA we redirect them to manage.
    return fail("CONFLICT", { form: "This booking is already confirmed." });
  }
  if (booking.status === "cancelled") {
    return fail("CONFLICT", { form: "This booking has been cancelled." });
  }

  const [{ data: tier }, { data: payment }] = await Promise.all([
    supabase.from("tiers").select("name").eq("id", booking.tier_id).maybeSingle(),
    supabase
      .from("booking_payments")
      .select("id, amount, currency")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!tier || !payment) return fail("NOT_FOUND");

  const baseUrl = getBaseUrl();
  const stripe = getStripe();

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      // FPX (Malaysian online banking) added in v1.1; card-only for v1.
      payment_method_types: ["card"],
      mode: "payment",
      currency: (payment.currency ?? "MYR").toLowerCase(),
      customer_email: booking.booker_email,
      line_items: [
        {
          price_data: {
            currency: (payment.currency ?? "MYR").toLowerCase(),
            product_data: {
              name: `AgarthaOS — ${tier.name}`,
              description: `Booking ${parsed.data.booking_ref}`,
            },
            // Stripe expects the smallest currency unit (sen for MYR).
            unit_amount: Math.round(Number(payment.amount) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        booking_ref: parsed.data.booking_ref,
      },
      payment_intent_data: {
        metadata: {
          booking_id: booking.id,
          booking_ref: parsed.data.booking_ref,
        },
      },
      // Stripe replaces {CHECKOUT_SESSION_ID} with the actual id when
      // it redirects the user back. The payment page reads `session_id`
      // to switch into "processing" while the webhook lands.
      success_url: `${baseUrl}/book/payment?ref=${parsed.data.booking_ref}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/book/payment?ref=${parsed.data.booking_ref}&cancelled=1`,
      // 30-min Session expiry mirrors the booking hold + a small buffer.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
  } catch (err) {
    after(async () => {
      loggerWith({ feature: "booking", event: "start_payment.stripe_error" }).error(
        {
          booking_ref: parsed.data.booking_ref,
          err: err instanceof Error ? err.message : String(err),
        },
        "stripe.checkout.sessions.create threw",
      );
    });
    return fail("DEPENDENCY_FAILED", {
      form: "We couldn't reach the payment provider. Please try again in a moment.",
    });
  }

  if (!session.url) {
    return fail("DEPENDENCY_FAILED", {
      form: "Payment session created but no redirect URL was returned. Try again.",
    });
  }

  // 7. Persist the payment_intent_id + Checkout Session id so the
  // webhook can correlate. payment_intent on a fresh Session is null
  // for SETUP-mode but for our `mode: "payment"` it's populated.
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  const { error: updateErr } = await supabase
    .from("booking_payments")
    .update({
      payment_intent_id: paymentIntentId,
      gateway_ref: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (updateErr) {
    after(async () => {
      loggerWith({ feature: "booking", event: "start_payment.db_error" }).error(
        { booking_ref: parsed.data.booking_ref, error: updateErr.message },
        "Failed to persist payment_intent_id",
      );
    });
    // Don't block the user — the webhook can still correlate via
    // `metadata.booking_id` if payment_intent_id is missing.
  }

  // 8. Telemetry.
  after(async () => {
    loggerWith({ feature: "booking", event: "start_payment.session_created" }).info(
      {
        booking_ref: parsed.data.booking_ref,
        session_id: session.id,
        payment_intent_id: paymentIntentId,
      },
      "startPaymentAction",
    );
  });

  return ok({ redirectUrl: session.url });
}
