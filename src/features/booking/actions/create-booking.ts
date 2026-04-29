"use server";

import "server-only";

import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { fail, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { rotateGuestCsrf, verifyGuestSameOrigin } from "@/lib/auth/guest-csrf";
import { guestSpan } from "@/lib/telemetry-guest";

import {
  createBookingSchema,
  type CreateBookingInput,
} from "@/features/booking/schemas/booking-wizard";
import type { CreatedBooking, PromoFailureReason } from "@/features/booking/types/wizard";
import { GUEST_BOOKING_REF_COOKIE } from "@/features/booking/constants";

/**
 * Public-booking creation — invokes `rpc_create_booking` (init_schema.sql:5371)
 * via the service-role client because the RPC is REVOKE'd from anon and only
 * GRANTed to authenticated (init_schema.sql:5456-5457). Calling it via the
 * anon-key SSR client would fail with permission denied. Service-role
 * bypasses RLS — that's the contract: anonymous mutations against a typed
 * RPC, with all server-side guards (capacity, facility max, strict promo
 * validation, atomic SELECT FOR UPDATE) enforced inside the function body.
 *
 * Spec: frontend_spec.md:3444 ("invokes rpc_create_booking using service_role
 * key — not client anon key, prevents guest-side parameter manipulation").
 *
 * RPC raises (init_schema.sql:5388-5425):
 *   EXPERIENCE_NOT_FOUND | TIME_SLOT_NOT_FOUND | SLOT_FULL | TIER_NOT_FOUND
 *   FACILITY_AT_CAPACITY | PROMO_NOT_FOUND | PROMO_INACTIVE | PROMO_EXPIRED
 *   PROMO_MAX_USES_REACHED | PROMO_GROUP_TOO_SMALL | PROMO_TIER_MISMATCH
 *   PROMO_DAY_INVALID | PROMO_TIME_INVALID | PROMO_CAMPAIGN_INACTIVE
 * — every code maps to a user-facing copy in PROMO_REASON_COPY /
 * CAPACITY_REASON_COPY.
 *
 * On success we rotate the guest_csrf cookie (Session 17 prompt
 * §"Guest-Specific Contracts" — token rotated after each successful
 * mutation) and then `redirect()` to /book/payment with the booking_id in
 * the URL. The redirect throws — anything after it is unreachable.
 */
const limiter = createRateLimiter({
  // Spec: 10/hour/IP, 3/min/IP (frontend_spec.md:104). The guest booking
  // create is the most expensive guest mutation; tight rate limiting also
  // limits inventory-hold abuse since each successful call increments
  // time_slots.booked_count atomically.
  tokens: 10,
  window: "1 h",
  prefix: "guest-create-booking",
});

const burstLimiter = createRateLimiter({
  tokens: 3,
  window: "60 s",
  prefix: "guest-create-booking-burst",
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

const PROMO_REASON_COPY: Record<PromoFailureReason, string> = {
  TIER_NOT_FOUND: "We couldn't find that tier — pick another and try again.",
  PROMO_NOT_FOUND: "That promo code doesn't exist.",
  PROMO_INACTIVE: "That promo code isn't active right now.",
  PROMO_EXPIRED: "That promo code has expired.",
  PROMO_MAX_USES_REACHED: "That promo code has reached its usage limit.",
  PROMO_GROUP_TOO_SMALL: "Your group is too small for that promo code.",
  PROMO_TIER_MISMATCH: "That promo code doesn't apply to the selected tier.",
  PROMO_DAY_INVALID: "That promo code isn't valid on the selected date.",
  PROMO_TIME_INVALID: "That promo code isn't valid at the selected time.",
  PROMO_CAMPAIGN_INACTIVE: "The campaign for that promo code has ended.",
};

const CAPACITY_REASON_COPY: Record<string, string> = {
  EXPERIENCE_NOT_FOUND: "We couldn't find that experience — please refresh and try again.",
  TIME_SLOT_NOT_FOUND: "That time slot is no longer available — please pick another.",
  SLOT_FULL: "That time slot just sold out — please choose a different one.",
  TIER_NOT_FOUND: "We couldn't find that tier — please pick another.",
  FACILITY_AT_CAPACITY: "The facility is at capacity for that slot — please pick another time.",
};

type CreateBookingResult = ServerActionResult<CreatedBooking>;

export async function createBookingAction(input: CreateBookingInput): Promise<CreateBookingResult> {
  return guestSpan(
    {
      name: "guest.book.confirmed",
      attributes: {
        adults: input.p_adult_count,
        children: input.p_child_count,
        has_promo: Boolean(input.p_promo_code),
      },
    },
    () => createBookingActionImpl(input),
  );
}

async function createBookingActionImpl(input: CreateBookingInput): Promise<CreateBookingResult> {
  // 1. Validate input.
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  // 1b. CSRF — same-origin check. Belt-and-suspenders alongside Next.js'
  // built-in serverActions origin enforcement.
  if (!(await verifyGuestSameOrigin())) return fail("FORBIDDEN");

  // 2. Auth — anonymous; no session check.
  // 3. Rate limit by IP — both per-hour and burst window per spec.
  const ip = await clientIp();
  const [hourly, burst] = await Promise.all([limiter.limit(ip), burstLimiter.limit(ip)]);
  if (!hourly.success || !burst.success) return fail("RATE_LIMITED");

  // 4. Idempotency — the RPC's atomic capacity lock is the gate; double-submit
  // would either succeed (extra inventory) or fail SLOT_FULL. Form submission
  // is single-shot from the wizard; no idempotency key wired here.
  // (When we add a webhook-driven retry path in Session 18 the Edge Function
  // owns its own idempotency ledger.)

  // 5. Execute via service-role client (RPC is REVOKE'd from anon).
  // exactOptionalPropertyTypes guards us from `p_promo_code: undefined`,
  // so the optional field is spread conditionally.
  const supabase = createSupabaseServiceClient();
  const rpcArgs = {
    p_experience_id: parsed.data.p_experience_id,
    p_time_slot_id: parsed.data.p_time_slot_id,
    p_tier_id: parsed.data.p_tier_id,
    p_booker_name: parsed.data.p_booker_name,
    p_booker_email: parsed.data.p_booker_email,
    p_booker_phone: parsed.data.p_booker_phone,
    p_adult_count: parsed.data.p_adult_count,
    p_child_count: parsed.data.p_child_count,
    ...(parsed.data.p_promo_code ? { p_promo_code: parsed.data.p_promo_code } : {}),
  };
  const { data, error } = await supabase.rpc("rpc_create_booking", rpcArgs);

  if (error) {
    const msg = error.message ?? "";
    // Promo failure reasons → field-level error on promo_code.
    for (const reason of Object.keys(PROMO_REASON_COPY) as PromoFailureReason[]) {
      if (msg.includes(reason)) {
        return fail("VALIDATION_FAILED", { p_promo_code: PROMO_REASON_COPY[reason] });
      }
    }
    // Capacity / lookup failures → form-level error.
    for (const code of Object.keys(CAPACITY_REASON_COPY)) {
      if (msg.includes(code)) {
        return fail(
          code === "SLOT_FULL" || code === "FACILITY_AT_CAPACITY" ? "CONFLICT" : "NOT_FOUND",
          {
            form: CAPACITY_REASON_COPY[code]!,
          },
        );
      }
    }
    after(async () => {
      loggerWith({ feature: "booking", event: "create.error" }).error(
        { msg },
        "createBookingAction failed",
      );
    });
    return fail("INTERNAL");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fail("INTERNAL");
  }
  const created = data as CreatedBooking;

  // 6. Discriminated-union result.
  // 7. Cache invalidation — guest catalog and slots are not cached as path
  // tags (per ADR-0006, RLS-scoped reads stay on React.cache only). The
  // RPC's UPDATE on time_slots.booked_count will be reflected by the next
  // anon read of rpc_get_available_slots without any explicit purge.
  // 8. Telemetry + CSRF rotation.
  await rotateGuestCsrf();

  after(async () => {
    loggerWith({ feature: "booking", event: "create.success" }).info(
      {
        booking_id: created.booking_id,
        booking_ref: created.booking_ref,
        total_price: created.total_price,
        adults: parsed.data.p_adult_count,
        children: parsed.data.p_child_count,
      },
      "createBookingAction",
    );
  });

  // Stash booking_id in an httpOnly cookie so /book/payment (Session 17
  // Route 2) can resume the flow without trusting a URL param. 30 minutes —
  // long enough for the user to complete payment, short enough that the
  // cookie expires before the abandonment sweep at 15 min would have already
  // cancelled the booking.
  const store = await cookies();
  store.set(GUEST_BOOKING_REF_COOKIE, created.booking_ref, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });

  // Note: we don't return ok() because redirect() throws and this branch
  // never resumes. The return-type signature stays Promise<...> for the
  // type-checker; the function exits via throw.
  const locale = await getLocale();
  redirect({ href: `/book/payment?ref=${encodeURIComponent(created.booking_ref)}`, locale });
  return undefined as never; // redirect() throws — unreachable
}
