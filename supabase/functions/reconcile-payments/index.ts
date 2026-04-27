import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

/**
 * reconcile-payments — pg_cron-driven Stripe state reconciler.
 *
 * Purpose: catch payments where the webhook never landed (network blip,
 * Stripe outage, our 5xx during webhook receipt). Every 5 minutes the
 * `cron-payment-reconcile` pg_cron job (defined in
 * `phase2_security_additions.sql`) hits this function with a vault-
 * sourced bearer token; we then sweep `booking_payments` rows still in
 * `pending` after 2 minutes and ask Stripe for ground truth.
 *
 * Sequence:
 *   1. Auth: bearer token must equal `cron_secret` (Supabase Vault).
 *      Anything else → 401 immediately. Even if someone discovers the
 *      function URL, they can't poke real Stripe APIs without the token.
 *   2. Find pending payments older than 2 minutes.
 *   3. For each, `stripe.paymentIntents.retrieve(payment_intent_id)`.
 *   4. If the gateway's status is terminal (`succeeded`, `canceled`,
 *      `requires_payment_method` after an attempt), synthesize a
 *      `rpc_apply_payment_event` call with a deterministic event_id
 *      (`recon_<payment_intent_id>_<status>`) so duplicates from a
 *      subsequent webhook arrival short-circuit on the unique PK.
 *   5. Pending gateway state → skip; let the next cron tick try again.
 *
 * Limits:
 *   - Stripe API rate-limit budget: 100 read req/s in test mode, more
 *     in live. We process at most 200 rows per invocation to stay
 *     well under the budget even on a busy day.
 *   - `statement_timeout` for the SELECT is plenty (the index on
 *     `booking_payments.status` keeps it fast).
 *
 * What this DOES NOT do:
 *   - Send emails. The webhook handler is the canonical email
 *     dispatcher. If we trigger the same RPC and the booking flips,
 *     the email path is missed — accept this as a v1 trade-off.
 *     Operational alternative: enqueue a reconciliation-side email
 *     dispatch in a follow-up PR.
 */

interface BookingPaymentRow {
  id: string;
  payment_intent_id: string;
  created_at: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const STRIPE_API_VERSION = "2025-09-30.clover";
const PAGE_LIMIT = 200;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── 1. Auth ───────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!cronSecret) {
    return jsonResponse({ error: "CRON_SECRET not configured" }, 500);
  }
  if (!stripeSecretKey) {
    // Without Stripe, there's nothing to reconcile against. Return 200
    // so pg_cron doesn't keep retrying — but log it.
    console.warn("[reconcile-payments] STRIPE_SECRET_KEY not configured — skipping");
    return jsonResponse({ skipped: true, reason: "stripe_not_configured" });
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const stripe = new Stripe(stripeSecretKey, {
    // deno-lint-ignore no-explicit-any
    apiVersion: STRIPE_API_VERSION as any,
  });

  // ── 2. Find pending payments older than 2 min ────────────────────
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data: pending, error: pendingErr } = await admin
    .from("booking_payments")
    .select("id, payment_intent_id, created_at")
    .eq("status", "pending")
    .not("payment_intent_id", "is", null)
    .lt("created_at", cutoff)
    .limit(PAGE_LIMIT);

  if (pendingErr) {
    console.error("[reconcile-payments] fetch failed:", pendingErr.message);
    return jsonResponse({ error: "Fetch failed", detail: pendingErr.message }, 500);
  }

  const rows = (pending ?? []) as BookingPaymentRow[];
  if (rows.length === 0) {
    return jsonResponse({ checked: 0, applied: 0 });
  }

  // ── 3-4. For each, retrieve + apply ──────────────────────────────
  let applied = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const intent = await stripe.paymentIntents.retrieve(row.payment_intent_id);

      // Stripe statuses that are terminal-success / terminal-failure:
      //   succeeded                         → apply success
      //   canceled                          → apply failure
      //   requires_payment_method (after attempt) + last_payment_error → apply failure
      // Pending: requires_payment_method (initial), requires_confirmation, requires_action,
      //   processing — leave as-is for the next cron tick.
      let nextStatus: "success" | "failed" | null = null;
      let paidAt: string | null = null;

      if (intent.status === "succeeded") {
        nextStatus = "success";
        paidAt = intent.created
          ? new Date(intent.created * 1000).toISOString()
          : new Date().toISOString();
      } else if (intent.status === "canceled") {
        nextStatus = "failed";
      } else if (
        intent.status === "requires_payment_method" &&
        intent.last_payment_error
      ) {
        nextStatus = "failed";
      }

      if (!nextStatus) {
        skipped += 1;
        continue;
      }

      // Deterministic synthetic event_id so a subsequent real webhook
      // delivering the same terminal event short-circuits via the
      // payment_webhook_events PK uniqueness.
      const synthId = `recon_${intent.id}_${nextStatus}`;

      // Insert a payment_webhook_events row first (skip on conflict —
      // a real webhook beat us to it, that's fine).
      const { error: ledgerErr } = await admin
        .from("payment_webhook_events")
        .insert({
          event_id: synthId,
          event_type: `reconcile.${nextStatus}`,
          payment_intent_id: intent.id,
          raw_payload: { source: "reconcile-payments", intent_id: intent.id, status: intent.status },
        });

      if (ledgerErr) {
        if (ledgerErr.code === "23505") {
          skipped += 1;
          continue;
        }
        errors.push(`${intent.id}: ${ledgerErr.message}`);
        continue;
      }

      const { data: applyResult, error: applyErr } = await admin.rpc("rpc_apply_payment_event", {
        p_event_id: synthId,
        p_payment_intent: intent.id,
        p_new_status: nextStatus,
        p_paid_at: paidAt,
      });

      if (applyErr) {
        errors.push(`${intent.id}: ${applyErr.message}`);
        continue;
      }

      const result = applyResult as { success?: boolean; error?: string } | null;
      if (result?.success) {
        applied += 1;
      } else {
        errors.push(`${intent.id}: ${result?.error ?? "rpc returned non-success"}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${row.payment_intent_id}: ${msg}`);
    }
  }

  console.log(
    `[reconcile-payments] checked=${rows.length} applied=${applied} skipped=${skipped} errors=${errors.length}`
  );

  return jsonResponse({
    checked: rows.length,
    applied,
    skipped,
    errors: errors.slice(0, 10),
  });
});
