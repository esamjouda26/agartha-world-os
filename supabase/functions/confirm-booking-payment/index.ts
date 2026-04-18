import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * confirm-booking-payment — Payment gateway webhook handler
 *
 * Called by the payment gateway after processing a booking payment.
 * Correlates via payment_intent_id, transitions booking to confirmed,
 * and triggers a confirmation email via the send-email Edge Function.
 *
 * Auth: Webhook secret (not a JWT — verify_jwt must be disabled for this function).
 *
 * Requires environment variables:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WEBHOOK_SECRET — shared secret from payment gateway for signature verification
 */

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface WebhookPayload {
  payment_intent_id: string;
  status: "success" | "failed";
  gateway_ref?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, x-webhook-signature",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");

  // Verify webhook signature (gateway-specific — adapt to your provider)
  if (webhookSecret) {
    const signature = req.headers.get("x-webhook-signature");
    if (signature !== webhookSecret) {
      return jsonResponse({ error: "Invalid webhook signature" }, 401);
    }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { payment_intent_id, status: paymentStatus, gateway_ref } = payload;

  if (!payment_intent_id) {
    return jsonResponse({ error: "payment_intent_id is required" }, 400);
  }

  const VALID_STATUSES = ["success", "failed"] as const;
  if (!VALID_STATUSES.includes(paymentStatus as typeof VALID_STATUSES[number])) {
    return jsonResponse({ error: `Invalid status: ${paymentStatus}. Expected: ${VALID_STATUSES.join(", ")}` }, 400);
  }

  // ── 1. Find the booking payment by payment_intent_id ──────────────────

  const { data: payment, error: paymentErr } = await admin
    .from("booking_payments")
    .select("id, booking_id, status")
    .eq("payment_intent_id", payment_intent_id)
    .single();

  if (paymentErr || !payment) {
    console.error(`[confirm-booking-payment] Payment not found: ${payment_intent_id}`);
    return jsonResponse({ error: "Payment record not found" }, 404);
  }

  // Idempotency: if already processed, return success
  if (payment.status !== "pending") {
    console.log(`[confirm-booking-payment] Already processed: ${payment_intent_id} (${payment.status})`);
    return jsonResponse({ already_processed: true, current_status: payment.status });
  }

  // ── 2. Update booking_payments status ─────────────────────────────────

  const paymentUpdate: Record<string, unknown> = {
    status: paymentStatus,
    updated_at: new Date().toISOString(),
  };

  if (paymentStatus === "success") {
    paymentUpdate.paid_at = new Date().toISOString();
  }
  if (gateway_ref) {
    paymentUpdate.gateway_ref = gateway_ref;
  }

  const { error: updatePaymentErr } = await admin
    .from("booking_payments")
    .update(paymentUpdate)
    .eq("id", payment.id);

  if (updatePaymentErr) {
    console.error(`[confirm-booking-payment] Failed to update payment:`, updatePaymentErr.message);
    return jsonResponse({ error: "Failed to update payment" }, 500);
  }

  // ── 3. If payment successful, confirm the booking ─────────────────────

  if (paymentStatus === "success") {
    const { error: updateBookingErr } = await admin
      .from("bookings")
      .update({
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.booking_id)
      .eq("status", "pending_payment"); // guard: only transition from pending_payment

    if (updateBookingErr) {
      console.error(`[confirm-booking-payment] Failed to confirm booking:`, updateBookingErr.message);
      return jsonResponse({ error: "Payment recorded but booking confirmation failed" }, 500);
    }

    // ── 4. Fetch booking details for confirmation email ────────────────

    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .select(`
        booking_ref, booker_name, booker_email, qr_code_ref,
        total_price, adult_count, child_count,
        tier_id, tiers!inner(name),
        time_slot_id, time_slots!inner(slot_date, start_time)
      `)
      .eq("id", payment.booking_id)
      .single();

    if (!bookingErr && booking) {
      const tier = booking.tiers as { name: string };
      const slot = booking.time_slots as { slot_date: string; start_time: string };

      // ── 5. Trigger confirmation email via send-email function ──────

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type: "booking_confirmation",
            booking_ref: booking.booking_ref,
            booker_name: booking.booker_name,
            booker_email: booking.booker_email,
            qr_code_ref: booking.qr_code_ref,
            slot_date: slot.slot_date,
            start_time: slot.start_time,
            tier_name: tier.name,
            total_price: booking.total_price,
            adult_count: booking.adult_count,
            child_count: booking.child_count,
          }),
        });
        console.log(`[confirm-booking-payment] Confirmation email triggered for ${booking.booking_ref}`);
      } catch (emailErr) {
        // Email failure is non-blocking — booking is confirmed regardless
        console.error(`[confirm-booking-payment] Email trigger failed:`, emailErr);
      }
    }

    console.log(`[confirm-booking-payment] Booking confirmed for payment ${payment_intent_id}`);
    return jsonResponse({
      status: "confirmed",
      booking_id: payment.booking_id,
      payment_intent_id,
    });
  }

  // ── Payment failed — booking stays as pending_payment (cron will cancel it) ──

  console.log(`[confirm-booking-payment] Payment failed for ${payment_intent_id}`);
  return jsonResponse({
    status: "payment_failed",
    booking_id: payment.booking_id,
    payment_intent_id,
  });
});
