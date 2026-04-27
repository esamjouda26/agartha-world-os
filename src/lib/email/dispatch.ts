import "server-only";

import { env } from "@/lib/env";
import { loggerWith } from "@/lib/logger";

/**
 * dispatchEmail — invoke the `send-email` Edge Function from Server Actions.
 *
 * The Edge Function (`supabase/functions/send-email/index.ts`) is the single
 * transactional-email entry point. It's idempotent (consults
 * `email_dispatch_log` before each Resend call) and handles every flow the
 * guest portal + staff portal need.
 *
 * Why a thin helper rather than `supabase.functions.invoke()`:
 *   - Server Actions don't carry a user JWT to the function (it's
 *     authenticated by the service role); the supabase-js `functions.invoke`
 *     surface forwards the action user's auth header by default which is
 *     wrong here.
 *   - We want a synchronous, fire-and-forget pattern with structured
 *     logging at the call site, not a Promise that propagates errors back
 *     into the user's request — email failures should NEVER break the
 *     mutation that triggered them.
 *
 * Usage from a Server Action:
 *
 *   after(async () => {
 *     await dispatchEmail({ type: "booking_otp", booking_ref: ref });
 *   });
 *
 * `after()` is critical: the email round-trip can take 200-800ms (DNS +
 * TLS + Resend's edge), and the user's redirect after OTP request must
 * not wait on it. We accept best-effort delivery; the idempotency ledger
 * means a retry path (a future "Resend OTP" CTA, or a cron-driven
 * reconciler) can re-attempt without producing duplicates.
 */

// Discriminated union mirrors the Edge Function's request type. Keep this
// in lockstep with `supabase/functions/send-email/index.ts`.
export type EmailDispatchInput =
  | { type: "booking_otp"; booking_ref: string }
  | {
      type: "booking_confirmation";
      booking_ref: string;
      booker_name: string;
      booker_email: string;
      qr_code_ref: string;
      slot_date: string;
      start_time: string;
      tier_name: string;
      total_price: number;
      adult_count: number;
      child_count: number;
      discount_applied?: number;
    }
  | {
      type: "booking_modified";
      booking_ref: string;
      booker_name: string;
      booker_email: string;
      new_slot_date: string;
      new_start_time: string;
    }
  | {
      type: "booking_cascaded";
      booking_ref: string;
      booker_name: string;
      booker_email: string;
      old_slot_date: string;
      old_start_time: string;
      new_slot_date: string;
      new_start_time: string;
      reason?: string;
    }
  | {
      type: "payment_failed";
      booking_ref: string;
      booker_name: string;
      booker_email: string;
      reason?: string;
    };

type DispatchResult =
  | { ok: true; sent: boolean; idempotent: boolean; messageId: string | null }
  | { ok: false; error: string };

const log = loggerWith({ feature: "email", event: "dispatch" });

export async function dispatchEmail(input: EmailDispatchInput): Promise<DispatchResult> {
  // Production safety: a guest portal that silently swallows OTPs is
  // worse than one that 500s loudly. In dev/preview we accept the soft
  // fail (the OTP is still in `otp_challenges` and can be read out for
  // local testing). In production we log at ERROR so on-call notices.
  if (!env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      log.error(
        { type: input.type },
        "RESEND_API_KEY unset in production — guest will not receive their email",
      );
    } else {
      log.info({ type: input.type }, "RESEND_API_KEY unset — skipping dispatch (dev)");
    }
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const fnUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;
  const startedAt = Date.now();

  let res: Response;
  try {
    res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The Edge Function uses the service-role internally; the
        // `apikey` header gates the gateway. anon-key is sufficient
        // because the function itself uses the service-role bound to
        // its Deno env, not the caller's token.
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(input),
    });
  } catch (err) {
    log.error(
      { type: input.type, err: err instanceof Error ? err.message : String(err) },
      "send-email fetch threw",
    );
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }

  const elapsed = Date.now() - startedAt;

  type FnResponse = {
    sent?: boolean;
    idempotent?: boolean;
    message_id?: string | null;
    error?: string;
    detail?: string;
  };

  let body: FnResponse;
  try {
    body = (await res.json()) as FnResponse;
  } catch {
    body = {};
  }

  if (!res.ok) {
    log.error(
      {
        type: input.type,
        status: res.status,
        elapsed_ms: elapsed,
        error: body.error,
        detail: body.detail,
      },
      "send-email returned non-2xx",
    );
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }

  log.info(
    {
      type: input.type,
      sent: body.sent ?? false,
      idempotent: body.idempotent ?? false,
      message_id: body.message_id ?? null,
      elapsed_ms: elapsed,
    },
    "send-email dispatched",
  );

  return {
    ok: true,
    sent: body.sent ?? false,
    idempotent: body.idempotent ?? false,
    messageId: body.message_id ?? null,
  };
}
