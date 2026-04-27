import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { dispatchEmail } from "@/lib/email/dispatch";
import { env } from "@/lib/env";
import { loggerWith } from "@/lib/logger";
import { getStripe, isStripeConfigured } from "@/lib/payments/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

import { BOOKING_ROUTER_PATHS } from "@/features/booking/cache-tags";
import { revalidatePath } from "next/cache";

/**
 * Stripe webhook handler.
 *
 * Pipeline (per CLAUDE.md §4 + plan §A2):
 *   1. Signature verify via `stripe.webhooks.constructEvent` against the
 *      raw request body. Invalid signature → 401, no further processing.
 *   2. Insert into `payment_webhook_events` with the gateway's event_id
 *      as PK. ON CONFLICT DO NOTHING short-circuits duplicates so a
 *      retried webhook delivery doesn't double-process.
 *   3. State correlation via `payment_intent_id` → `booking_payments`.
 *      Orphan intents log SEV-3 + return 200 (we don't want Stripe to
 *      retry an intent we don't recognise).
 *   4. Atomic commit via `rpc_apply_payment_event`. The RPC owns the
 *      booking flip + payment status update + ledger update inside one
 *      transaction.
 *   5. Notification side-effects: confirmation email on success,
 *      payment_failed email on failure. Both fire-and-forget through
 *      `dispatchEmail` (idempotent itself).
 *   6. Cache invalidation via per-feature paths.
 *   7. DLQ on processing_attempts ≥ 3.
 *
 * Why a route handler vs an Edge Function: keeps the webhook URL on our
 * domain (Stripe dashboard URL = our domain), single Stripe SDK install,
 * unified logging pipeline, easier local testing via `stripe-cli`.
 *
 * Response time MUST be < 5s (Stripe's reasonable-attempt window). All
 * heavy work is sync to disk + RPC commit; email side-effects live
 * inside `dispatchEmail` which is itself a fire-and-forget HTTP call —
 * acceptable because the Edge Function is hosted on Supabase (regional
 * latency) and we don't `await` its full delivery, only the function
 * invocation handshake.
 */

// Stripe sends application/json with a raw body that MUST be exactly
// what was signed. Next reads JSON for us by default; we read text() so
// we can pass the raw body to constructEvent.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = loggerWith({ feature: "payments", event: "webhook.stripe" });

const MAX_PROCESSING_ATTEMPTS = 3;

type EventTypeNarrow =
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "charge.refunded";

const HANDLED_EVENTS: ReadonlySet<EventTypeNarrow> = new Set<EventTypeNarrow>([
  "checkout.session.completed",
  "checkout.session.expired",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
]);

function isHandledEvent(t: string): t is EventTypeNarrow {
  return (HANDLED_EVENTS as ReadonlySet<string>).has(t);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Configuration guard — without these the verifyEvent step would throw
  // and Stripe would retry. Better to fail fast and loud.
  if (!isStripeConfigured() || !env.STRIPE_WEBHOOK_SECRET) {
    log.error("Stripe webhook hit but STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sigHeader = request.headers.get("stripe-signature");
  if (!sigHeader) {
    log.warn("Stripe webhook missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // text() returns the raw body unchanged — required for HMAC verify.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Stripe webhook signature verification failed",
    );
    // SEV-4: anyone can hit this endpoint, but signature failures should
    // still alert if they spike — stripe.com IPs only legitimately reach
    // here.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  // Step 2: idempotency ledger. Insert the event by id; on conflict,
  // short-circuit. The unique PK on event_id is what enforces dedup.
  const { error: insertErr } = await supabase
    .from("payment_webhook_events")
    // The supabase types insist on `Json` (recursive union) for raw_payload.
    // Stripe's Event is structurally compatible but not nominal-equivalent —
    // round-trip through unknown to make TS happy without a runtime cast.
    .insert({
      event_id: event.id,
      event_type: event.type,
      payment_intent_id: extractPaymentIntentId(event) ?? "",
      raw_payload: event as unknown as never,
    });

  if (insertErr) {
    if (insertErr.code === "23505") {
      // Duplicate delivery — Stripe retries are at-least-once; this is
      // the expected dedup path.
      log.info(
        { event_id: event.id, event_type: event.type },
        "Duplicate webhook event — short-circuit",
      );
      return NextResponse.json({ received: true, idempotent: true });
    }
    log.error(
      { event_id: event.id, error: insertErr.message },
      "Failed to insert payment_webhook_events row",
    );
    // 500 here causes Stripe to retry — desired, since the ledger insert
    // is the safety net.
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }

  // Step 3-7: process the event with retry/DLQ semantics.
  try {
    if (!isHandledEvent(event.type)) {
      // Acknowledge unhandled event types so Stripe doesn't retry forever.
      // Mark processed so they don't trigger reconciler retries either.
      await supabase
        .from("payment_webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("event_id", event.id);
      log.info(
        { event_id: event.id, event_type: event.type },
        "Webhook event acknowledged (no handler)",
      );
      return NextResponse.json({ received: true, handled: false });
    }

    await processEvent(supabase, event);
    log.info({ event_id: event.id, event_type: event.type }, "Webhook event processed");
    return NextResponse.json({ received: true });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    log.error(
      { event_id: event.id, event_type: event.type, error: errMessage },
      "Webhook event processing failed",
    );

    // Increment attempts; if we've crossed the budget, fork to DLQ.
    const { data: ledger } = await supabase
      .from("payment_webhook_events")
      .select("processing_attempts")
      .eq("event_id", event.id)
      .maybeSingle();

    const attempts = (ledger?.processing_attempts ?? 0) + 1;
    await supabase
      .from("payment_webhook_events")
      .update({ processing_attempts: attempts, last_error: errMessage })
      .eq("event_id", event.id);

    if (attempts >= MAX_PROCESSING_ATTEMPTS) {
      await supabase.from("payment_webhook_events_dlq").insert({
        event_id: event.id,
        original_event: event as unknown as never,
        failure_count: attempts,
        last_error: errMessage,
      });
      log.error({ event_id: event.id, attempts }, "Webhook event moved to DLQ — SEV-2 alert");
    }

    // Return 500 so Stripe retries — but only up to MAX_PROCESSING_ATTEMPTS;
    // beyond that Stripe will give up and we have it in the DLQ.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

function extractPaymentIntentId(event: Stripe.Event): string | null {
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.expired": {
      const session = obj as unknown as Stripe.Checkout.Session;
      // payment_intent is `string | Stripe.PaymentIntent | null` depending
      // on `expand`. We don't expand, so it's a string id or null.
      return typeof session.payment_intent === "string" ? session.payment_intent : null;
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const pi = obj as unknown as Stripe.PaymentIntent;
      return pi.id;
    }
    case "charge.refunded": {
      const charge = obj as unknown as Stripe.Charge;
      return typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    }
    default:
      return null;
  }
}

type ServiceClient = ReturnType<typeof createSupabaseServiceClient>;

async function processEvent(supabase: ServiceClient, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "payment_intent.succeeded":
      await applySuccess(supabase, event);
      return;
    case "payment_intent.payment_failed":
    case "checkout.session.expired":
      await applyFailure(supabase, event);
      return;
    case "charge.refunded":
      // Refund flow not in v1 scope. Log + acknowledge so Stripe doesn't
      // keep retrying. The DLQ is for FAILED processing, not deliberate
      // no-ops.
      log.info({ event_id: event.id }, "charge.refunded received — refund flow deferred to v1.1");
      await supabase
        .from("payment_webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("event_id", event.id);
      return;
  }
}

async function applySuccess(supabase: ServiceClient, event: Stripe.Event): Promise<void> {
  const paymentIntentId = extractPaymentIntentId(event);
  if (!paymentIntentId) {
    throw new Error(`Cannot extract payment_intent_id from event ${event.id}`);
  }

  const paidAt = new Date().toISOString();
  const { data, error } = await supabase.rpc("rpc_apply_payment_event", {
    p_event_id: event.id,
    p_payment_intent: paymentIntentId,
    p_new_status: "success",
    p_paid_at: paidAt,
  });

  if (error) {
    throw new Error(`rpc_apply_payment_event failed: ${error.message}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("rpc_apply_payment_event returned non-object");
  }
  const result = data as { success: boolean; error?: string; booking_id?: string };
  if (!result.success) {
    if (result.error === "ORPHAN_PAYMENT_INTENT") {
      // The webhook is real but we have no matching booking_payments row.
      // Acknowledge — don't retry — and log SEV-3.
      log.warn(
        { event_id: event.id, payment_intent_id: paymentIntentId },
        "Orphan payment_intent webhook — SEV-3",
      );
      return;
    }
    throw new Error(`rpc_apply_payment_event reported failure: ${result.error ?? "unknown"}`);
  }

  // Refresh cache so /book/payment + /my-booking/manage show the new status.
  for (const path of BOOKING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  // Fetch booking details for the confirmation email.
  if (!result.booking_id) return;
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      booking_ref, booker_name, booker_email, qr_code_ref,
      total_price, adult_count, child_count,
      tiers!inner(name),
      time_slots!inner(slot_date, start_time)
    `,
    )
    .eq("id", result.booking_id)
    .maybeSingle();

  if (!booking) return;

  const tier = booking.tiers as unknown as { name: string };
  const slot = booking.time_slots as unknown as { slot_date: string; start_time: string };

  await dispatchEmail({
    type: "booking_confirmation",
    booking_ref: booking.booking_ref,
    booker_name: booking.booker_name,
    booker_email: booking.booker_email,
    qr_code_ref: booking.qr_code_ref ?? "",
    slot_date: slot.slot_date,
    start_time: slot.start_time,
    tier_name: tier.name,
    total_price: Number(booking.total_price),
    adult_count: booking.adult_count ?? 0,
    child_count: booking.child_count ?? 0,
  });
}

async function applyFailure(supabase: ServiceClient, event: Stripe.Event): Promise<void> {
  const paymentIntentId = extractPaymentIntentId(event);
  if (!paymentIntentId) {
    throw new Error(`Cannot extract payment_intent_id from event ${event.id}`);
  }

  const { data, error } = await supabase.rpc("rpc_apply_payment_event", {
    p_event_id: event.id,
    p_payment_intent: paymentIntentId,
    p_new_status: "failed",
    // p_paid_at omitted — RPC signature has DEFAULT NULL.
  });

  if (error) {
    throw new Error(`rpc_apply_payment_event failed: ${error.message}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("rpc_apply_payment_event returned non-object");
  }
  const result = data as { success: boolean; error?: string; booking_id?: string };
  if (!result.success) {
    if (result.error === "ORPHAN_PAYMENT_INTENT") {
      log.warn(
        { event_id: event.id, payment_intent_id: paymentIntentId },
        "Orphan payment_intent webhook — SEV-3",
      );
      return;
    }
    throw new Error(`rpc_apply_payment_event reported failure: ${result.error ?? "unknown"}`);
  }

  for (const path of BOOKING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  if (!result.booking_id) return;
  const { data: booking } = await supabase
    .from("bookings")
    .select("booking_ref, booker_name, booker_email")
    .eq("id", result.booking_id)
    .maybeSingle();

  if (!booking) return;

  // Stripe failure messages are user-friendly enough to surface directly
  // (e.g. "Your card was declined."); redact only if the message includes
  // PII (rare).
  let reason: string | undefined;
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as unknown as Stripe.PaymentIntent;
    reason = pi.last_payment_error?.message ?? undefined;
  } else if (event.type === "checkout.session.expired") {
    reason = "Your checkout session expired before payment was completed.";
  }

  await dispatchEmail({
    type: "payment_failed",
    booking_ref: booking.booking_ref,
    booker_name: booking.booker_name,
    booker_email: booking.booker_email,
    ...(reason ? { reason } : {}),
  });
}
