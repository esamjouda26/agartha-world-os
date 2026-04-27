"use server";

import "server-only";

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { dispatchEmail } from "@/lib/email/dispatch";
import { rotateGuestCsrf, verifyGuestSameOrigin } from "@/lib/auth/guest-csrf";
import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readGuestSession } from "@/lib/auth/guest-session";
import { guestSpan } from "@/lib/telemetry-guest";

import { BOOKING_ROUTER_PATHS } from "@/features/booking/cache-tags";

/**
 * Reschedule the cookie-bound booking to a new time slot.
 *
 * Spec: frontend_spec.md:3613 + WF-7B "Reschedule" branch
 * (operational_workflows.md:778-809).
 *
 * The RPC owns ALL authoritative guards (status, 2h cutoff, capacity,
 * facility max, promo re-validation). The action simply maps the eight
 * possible failure codes to user-facing copy.
 *
 * `rpc_modify_booking` is REVOKE'd from anon; called via service-role
 * (init_schema.sql:5583-5584). The cookie-bound booking_ref scoping is
 * what prevents cross-booking abuse.
 *
 * Email side-effect: spec line 3613 trails with "→ sends `send-email`
 * (booking_modified) → `revalidatePath`". We fire-and-forget
 * `dispatchEmail` inside `after()` so the response isn't blocked by
 * Resend latency. The Edge Function dedupes on
 * `(booking_ref, new_slot_date, new_start_time)` so a double-clicked
 * Save doesn't duplicate the email.
 */

const inputSchema = z.object({
  new_time_slot_id: z.guid("Pick a new time slot"),
});
type RescheduleInput = z.infer<typeof inputSchema>;

const limiter = createRateLimiter({
  // Reschedule is rare; tight per-IP limit prevents an attacker who got
  // a session cookie from churning a booking through dozens of slots.
  tokens: 6,
  window: "10 m",
  prefix: "guest-reschedule",
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

const RPC_ERROR_COPY: Record<string, string> = {
  BOOKING_NOT_FOUND: "We couldn't find that booking. Please refresh and try again.",
  RESCHEDULE_NOT_ALLOWED:
    "Only confirmed bookings can be rescheduled. If you've already checked in, the team can help at the gate.",
  RESCHEDULE_TOO_LATE:
    "Reschedules close 2 hours before your entry time. Please contact us at the gate.",
  SAME_SLOT: "That's already your current slot — pick a different time.",
  NEW_SLOT_NOT_FOUND: "That slot is no longer available — please pick another.",
  SLOT_IN_PAST: "That slot is in the past — please pick a future time.",
  SLOT_FULL: "That slot just sold out — please pick another time.",
  FACILITY_AT_CAPACITY: "The facility is full at that time — please pick another slot.",
  PROMO_DAY_INVALID_AFTER_RESCHEDULE:
    "Your promo code isn't valid on that day. Pick a different date.",
  PROMO_TIME_INVALID_AFTER_RESCHEDULE:
    "Your promo code isn't valid at that time. Pick a different slot.",
};

type RescheduleSuccess = Readonly<{
  booking_ref: string;
  new_slot_date: string;
  new_start_time: string;
}>;

export async function rescheduleBookingAction(
  input: RescheduleInput,
): Promise<ServerActionResult<RescheduleSuccess>> {
  return guestSpan({ name: "guest.reschedule.completed" }, () =>
    rescheduleBookingActionImpl(input),
  );
}

async function rescheduleBookingActionImpl(
  input: RescheduleInput,
): Promise<ServerActionResult<RescheduleSuccess>> {
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

  // 2. Auth — guest session cookie.
  const sessionRef = await readGuestSession();
  if (!sessionRef) return fail("UNAUTHENTICATED");

  // 3. Rate-limit (per IP).
  const ip = await clientIp();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Idempotency — RPC's transactional `UPDATE bookings SET time_slot_id`
  // makes a duplicate call after success a no-op (SAME_SLOT raised).

  // 5. Execute via service-role.
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("rpc_modify_booking", {
    p_booking_ref: sessionRef,
    p_new_time_slot_id: parsed.data.new_time_slot_id,
  });

  if (error) {
    const msg = error.message ?? "";
    for (const [code, copy] of Object.entries(RPC_ERROR_COPY)) {
      if (msg.includes(code)) {
        const errorKind: "CONFLICT" | "NOT_FOUND" | "FORBIDDEN" =
          code === "SLOT_FULL" || code === "FACILITY_AT_CAPACITY" || code === "SAME_SLOT"
            ? "CONFLICT"
            : code === "NEW_SLOT_NOT_FOUND" ||
                code === "BOOKING_NOT_FOUND" ||
                code === "SLOT_IN_PAST"
              ? "NOT_FOUND"
              : "FORBIDDEN";
        return fail(errorKind, { form: copy });
      }
    }
    after(async () => {
      loggerWith({ feature: "booking", event: "reschedule.error" }).error(
        { msg, booking_ref: sessionRef },
        "rescheduleBookingAction failed",
      );
    });
    return fail("INTERNAL");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fail("INTERNAL");
  }
  const result = data as RescheduleSuccess;

  // 6. Discriminated result. 7. Cache invalidation + CSRF rotation.
  await rotateGuestCsrf();
  for (const path of BOOKING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  // 8. Telemetry + email dispatch (fire-and-forget; email failure must
  // not break the action).
  after(async () => {
    loggerWith({ feature: "booking", event: "reschedule.success" }).info(
      {
        booking_ref: result.booking_ref,
        new_slot_date: result.new_slot_date,
        new_start_time: result.new_start_time,
      },
      "rescheduleBookingAction",
    );

    // Fetch booker fields the email template needs. The RPC return
    // surface intentionally omits PII; reading via service-role here
    // is the cleanest path without widening the RPC's contract.
    const { data: booker } = await supabase
      .from("bookings")
      .select("booker_name, booker_email")
      .ilike("booking_ref", result.booking_ref)
      .maybeSingle();

    if (booker?.booker_email) {
      await dispatchEmail({
        type: "booking_modified",
        booking_ref: result.booking_ref,
        booker_name: booker.booker_name,
        booker_email: booker.booker_email,
        new_slot_date: result.new_slot_date,
        new_start_time: result.new_start_time,
      });
    }
  });

  return ok(result);
}
