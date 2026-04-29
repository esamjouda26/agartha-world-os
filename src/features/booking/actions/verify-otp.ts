"use server";

import "server-only";

import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { z } from "zod";

import { fail, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rotateGuestCsrf, verifyGuestSameOrigin } from "@/lib/auth/guest-csrf";
import { signGuestSession } from "@/lib/auth/guest-session";
import { guestSpan } from "@/lib/telemetry-guest";

import { GUEST_OTP_PENDING_COOKIE } from "@/features/booking/constants";

/**
 * OTP verification → guest session establishment.
 *
 * Spec: frontend_spec.md:3575 + WF-7B verify block.
 * RPC: rpc_verify_otp (init_schema.sql:5502-5519). Anon-callable.
 *
 * Pipeline:
 *   1. Validate booking_ref + 6-digit numeric code
 *   2. Anonymous — no auth check
 *   3. Per-IP rate limit (frontend_spec.md:104 — 5 attempts/15min/session;
 *      we approximate via IP since there's no session yet)
 *   4. Idempotency — N/A; the RPC's per-challenge `attempts < 5` is the gate
 *   5. Call rpc_verify_otp via anon-key client
 *   6. On success: sign + set guest_session cookie, rotate guest_csrf cookie,
 *      clear guest_otp_pending cookie, redirect to /my-booking/manage
 *   7. No cache invalidation
 *   8. Telemetry
 */

const inputSchema = z.object({
  otp_code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});
type VerifyOtpInput = z.infer<typeof inputSchema>;

const limiter = createRateLimiter({
  // Spec: 5 attempts per 15 min per session (frontend_spec.md:105). No
  // session yet → approximate by IP. Slightly looser than RPC's
  // attempts<5 per challenge, which is a different axis.
  tokens: 10,
  window: "15 m",
  prefix: "guest-verify-otp",
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

type PendingPayload = Readonly<{ booking_ref: string; masked_email: string }>;

export async function verifyOtpAction(input: VerifyOtpInput): Promise<ServerActionResult<never>> {
  return guestSpan({ name: "guest.otp.verified" }, () => verifyOtpActionImpl(input));
}

async function verifyOtpActionImpl(input: VerifyOtpInput): Promise<ServerActionResult<never>> {
  // 1. Validate.
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  // 1b. CSRF — same-origin check (Origin/Referer matches Host).
  // Belt-and-suspenders on top of Next.js' built-in serverActions
  // origin enforcement.
  if (!(await verifyGuestSameOrigin())) return fail("FORBIDDEN");

  // 2. Auth — anonymous.
  // 3. Read the pending booking_ref from the cookie set by Route 3's
  // getBookingIdentityAction. If it's missing, the user lost context —
  // bounce them back to /my-booking.
  const store = await cookies();
  const pendingRaw = store.get(GUEST_OTP_PENDING_COOKIE)?.value;
  if (!pendingRaw) {
    return fail("UNAUTHENTICATED", {
      form: "Your session expired. Please request a new code.",
    });
  }
  let pending: PendingPayload;
  try {
    pending = JSON.parse(pendingRaw) as PendingPayload;
  } catch {
    return fail("UNAUTHENTICATED", {
      form: "Your session expired. Please request a new code.",
    });
  }
  if (typeof pending.booking_ref !== "string" || !pending.booking_ref) {
    return fail("UNAUTHENTICATED");
  }

  // 4. Rate-limit by IP.
  const ip = await clientIp();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  // 5. Execute via anon-key client.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_verify_otp", {
    p_booking_ref: pending.booking_ref,
    p_otp_code: parsed.data.otp_code,
  });

  if (error) {
    if (error.message.includes("OTP_EXPIRED")) {
      return fail("UNAUTHENTICATED", {
        form: "That code expired. Please request a new one.",
      });
    }
    if (error.message.includes("OTP_LOCKED")) {
      return fail("FORBIDDEN", {
        form: "Too many wrong attempts. Please request a new code.",
      });
    }
    if (error.message.includes("OTP_INVALID")) {
      return fail("VALIDATION_FAILED", {
        otp_code: "That code didn't match. Try again.",
      });
    }
    return fail("INTERNAL");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fail("INTERNAL");
  }

  // 6. Success: mint session + CSRF cookies, clear pending, redirect.
  await signGuestSession(pending.booking_ref);
  await rotateGuestCsrf();
  store.set(GUEST_OTP_PENDING_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/my-booking",
    maxAge: 0,
  });

  // 7. No cache invalidation.
  // 8. Telemetry.
  after(async () => {
    loggerWith({ feature: "booking", event: "otp.verified" }).info(
      { booking_ref: pending.booking_ref },
      "verifyOtpAction",
    );
  });

  const locale = await getLocale();
  redirect({ href: "/my-booking/manage", locale });
  return undefined as never; // redirect() throws — unreachable
}
