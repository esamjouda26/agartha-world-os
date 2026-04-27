"use server";

import "server-only";

import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { verifyGuestSameOrigin } from "@/lib/auth/guest-csrf";
import { dispatchEmail } from "@/lib/email/dispatch";
import { fail, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { guestSpan } from "@/lib/telemetry-guest";

import {
  bookingLookupSchema,
  type BookingLookupInput,
} from "@/features/booking/schemas/booking-lookup";
import { GUEST_OTP_PENDING_COOKIE } from "@/features/booking/constants";

/**
 * Booking lookup → OTP request.
 *
 * Spec: frontend_spec.md:3540 + WF-7B authentication block.
 * RPC: rpc_get_booking_identity (init_schema.sql:5479-5500), GRANTed to anon.
 *
 * The RPC itself enforces a per-booking 3/15-min OTP limit. We layer an
 * additional per-IP limit (10/15 min) so an attacker can't enumerate valid
 * booking_refs by burning through a fresh ref each time.
 *
 * On success the action stashes `{ booking_ref, masked_email }` in a
 * short-lived (5 min) httpOnly cookie so /my-booking/verify can show the
 * masked email reminder without leaking it through the URL. Then it
 * redirects to /my-booking/verify — the redirect throws NEXT_REDIRECT and
 * the function exits.
 *
 * Email delivery: the RPC inserts the OTP into `otp_challenges`; we
 * fire-and-forget `dispatchEmail({ type: "booking_otp", ... })` inside
 * `after()` so the redirect to /my-booking/verify isn't blocked by Resend
 * latency. The Edge Function is idempotent — a same-OTP retry short-
 * circuits via `email_dispatch_log`. When `RESEND_API_KEY` is unset
 * (dev/CI), `dispatchEmail` logs + skips so the flow remains testable
 * by reading the OTP from the DB.
 */

const ipLimiter = createRateLimiter({
  tokens: 10,
  window: "15 m",
  prefix: "guest-otp-request",
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

const OTP_PENDING_TTL_SECONDS = 5 * 60;

type IdentityResult = Readonly<{
  masked_email: string;
  booking_ref: string;
  otp_sent: boolean;
}>;

export async function getBookingIdentityAction(
  input: BookingLookupInput,
): Promise<ServerActionResult<never>> {
  return guestSpan({ name: "guest.otp.requested" }, () => getBookingIdentityActionImpl(input));
}

async function getBookingIdentityActionImpl(
  input: BookingLookupInput,
): Promise<ServerActionResult<never>> {
  // 1. Validate.
  const parsed = bookingLookupSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  // 1b. CSRF — same-origin check.
  if (!(await verifyGuestSameOrigin())) return fail("FORBIDDEN");

  // 2. Auth — anonymous; no auth check.
  // 3. IP rate-limit (defeats booking-ref enumeration via fresh refs).
  const ip = await clientIp();
  const lim = await ipLimiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Idempotency — N/A; the RPC's own per-booking limit is the gate.
  // 5. Execute via anon-key client.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_booking_identity", {
    p_booking_ref: parsed.data.booking_ref,
    // INET column — Supabase types it as `unknown`; the RPC casts text→inet
    // server-side, so passing the raw IP string is correct.
    p_ip_address: ip as never,
  });

  if (error) {
    if (error.message.includes("BOOKING_NOT_FOUND")) {
      // Friendly copy that doesn't disclose existence/status to enumeration.
      return fail("NOT_FOUND", {
        booking_ref:
          "We couldn't find that booking. Please double-check the reference, or contact us if you've already paid.",
      });
    }
    if (error.message.includes("OTP_RATE_LIMITED")) {
      return fail("RATE_LIMITED", {
        form: "We've already sent a code for this booking recently. Please check your inbox or wait a few minutes.",
      });
    }
    return fail("INTERNAL");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fail("INTERNAL");
  }
  const result = data as IdentityResult;

  // 6. Discriminated result happens via redirect on success.
  // 7. No cache invalidation.
  // 8. Telemetry + email dispatch — both inside `after()` so the user's
  // redirect isn't blocked by Resend latency or pino flush.
  after(async () => {
    loggerWith({ feature: "booking", event: "otp.requested" }).info(
      { booking_ref: result.booking_ref },
      "getBookingIdentityAction",
    );
    await dispatchEmail({ type: "booking_otp", booking_ref: result.booking_ref });
  });

  // Stash the masked-email + ref so /my-booking/verify can render the
  // reminder copy. 5-minute TTL matches otp_challenges.expires_at.
  const store = await cookies();
  store.set(
    GUEST_OTP_PENDING_COOKIE,
    JSON.stringify({ booking_ref: result.booking_ref, masked_email: result.masked_email }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/my-booking",
      maxAge: OTP_PENDING_TTL_SECONDS,
    },
  );

  redirect("/my-booking/verify" as never);
}
