"use server";

import "server-only";

import { after } from "next/server";
import { cookies, headers } from "next/headers";

import { dispatchEmail } from "@/lib/email/dispatch";
import { verifyGuestSameOrigin } from "@/lib/auth/guest-csrf";
import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { GUEST_OTP_PENDING_COOKIE } from "@/features/booking/constants";

/**
 * Resend the OTP for the booking_ref currently in the pending-OTP cookie.
 *
 * Re-invokes `rpc_get_booking_identity` (init_schema.sql:5479) which:
 *   - Invalidates prior unverified challenges for the same ref
 *   - Generates a new 6-digit code with a fresh 5-minute expiry
 *   - Honours the per-booking 3/15min limit
 *
 * Adds a per-IP cooldown (12 attempts / 15 min) so an attacker can't
 * burn through the per-booking limit on a stolen ref.
 *
 * Returns the new masked email — the form refreshes its display copy
 * inline without reloading the page.
 */

const limiter = createRateLimiter({
  tokens: 12,
  window: "15 m",
  prefix: "guest-resend-otp",
});

const PENDING_TTL_SECONDS = 5 * 60;

type ResendResult = Readonly<{
  masked_email: string;
  booking_ref: string;
}>;

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    "unknown"
  );
}

type PendingPayload = Readonly<{ booking_ref: string; masked_email: string }>;

export async function resendOtpAction(): Promise<ServerActionResult<ResendResult>> {
  // CSRF: same-origin verify before any state-touching read.
  if (!(await verifyGuestSameOrigin())) return fail("FORBIDDEN");

  const store = await cookies();
  const pendingRaw = store.get(GUEST_OTP_PENDING_COOKIE)?.value;
  if (!pendingRaw) return fail("UNAUTHENTICATED");

  let pending: PendingPayload;
  try {
    pending = JSON.parse(pendingRaw) as PendingPayload;
  } catch {
    return fail("UNAUTHENTICATED");
  }
  if (!pending.booking_ref) return fail("UNAUTHENTICATED");

  const ip = await clientIp();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_booking_identity", {
    p_booking_ref: pending.booking_ref,
    p_ip_address: ip as never,
  });

  if (error) {
    if (error.message.includes("OTP_RATE_LIMITED")) {
      return fail("RATE_LIMITED", {
        form: "We've sent a code recently — check your inbox or wait a few minutes.",
      });
    }
    return fail("INTERNAL");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fail("INTERNAL");
  }
  const fresh = data as ResendResult;

  // Refresh the pending cookie so the masked-email display picks up any
  // change (e.g., booker_email was edited between attempts via staff
  // tooling; unlikely but cheap to track).
  store.set(
    GUEST_OTP_PENDING_COOKIE,
    JSON.stringify({ booking_ref: fresh.booking_ref, masked_email: fresh.masked_email }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/my-booking",
      maxAge: PENDING_TTL_SECONDS,
    },
  );

  after(async () => {
    loggerWith({ feature: "booking", event: "otp.resend" }).info(
      { booking_ref: fresh.booking_ref },
      "resendOtpAction",
    );
    // The RPC invalidated prior unverified challenges and issued a fresh
    // OTP, so the dedup hash (which includes otp_code + expires_at) is
    // different from the original — Resend will fire a new email.
    await dispatchEmail({ type: "booking_otp", booking_ref: fresh.booking_ref });
  });

  return ok(fresh);
}
