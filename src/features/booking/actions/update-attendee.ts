"use server";

import "server-only";

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { verifyGuestSameOrigin } from "@/lib/auth/guest-csrf";
import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readGuestSession } from "@/lib/auth/guest-session";

import { BOOKING_ROUTER_PATHS } from "@/features/booking/cache-tags";

/**
 * Update one attendee's display + intent flags.
 *
 * Spec: frontend_spec.md:3614 — "UPDATE booking_attendees SET nickname,
 * face_pay_enabled, auto_capture_enabled".
 *
 * Important: face_pay / auto_capture flags are INTENT only. WF-7B
 * line 828 "Feature flags alone DO NOT authorize capture — an active
 * consent_records row is also required." The actual capture path lives
 * on /my-booking/manage/biometrics. This action just records intent.
 *
 * Auth model: the OTP-signed guest_session cookie scopes the update
 * to a single booking_ref. We verify the attendee belongs to that
 * booking BEFORE issuing the UPDATE, so a stolen cookie can never
 * reach into another booking's attendees.
 */

const inputSchema = z.object({
  attendee_id: z.guid("Invalid attendee"),
  // Caller passes a trimmed string (or empty); the action normalises empty
  // → null before the UPDATE so DB never stores blanks.
  nickname: z.string().trim().max(40, "Nickname must be 40 characters or fewer"),
  face_pay_enabled: z.boolean(),
  auto_capture_enabled: z.boolean(),
});
type UpdateAttendeeInput = z.infer<typeof inputSchema>;

const limiter = createRateLimiter({
  // Generous — guests poke toggles when configuring; tight enough to
  // suppress accidental loops.
  tokens: 60,
  window: "60 s",
  prefix: "guest-update-attendee",
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

export async function updateAttendeeAction(
  input: UpdateAttendeeInput,
): Promise<ServerActionResult<{ attendee_id: string }>> {
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

  // 3. Rate limit (per IP).
  const ip = await clientIp();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Idempotency — N/A; UPDATE is naturally idempotent.

  // 5. Verify attendee belongs to the cookie-bound booking, then UPDATE.
  const supabase = createSupabaseServiceClient();
  const { data: attendee, error: lookupError } = await supabase
    .from("booking_attendees")
    .select("id, booking_id, bookings!inner(booking_ref)")
    .eq("id", parsed.data.attendee_id)
    .maybeSingle();

  if (lookupError || !attendee) return fail("NOT_FOUND");
  // Narrow the joined-booking shape — Supabase returns the joined relation
  // as either an object or array depending on FK direction.
  const joinedRef = Array.isArray(attendee.bookings)
    ? attendee.bookings[0]?.booking_ref
    : attendee.bookings?.booking_ref;
  if (joinedRef?.toUpperCase() !== sessionRef) return fail("FORBIDDEN");

  const { error: updateError } = await supabase
    .from("booking_attendees")
    .update({
      nickname: parsed.data.nickname.length > 0 ? parsed.data.nickname : null,
      face_pay_enabled: parsed.data.face_pay_enabled,
      auto_capture_enabled: parsed.data.auto_capture_enabled,
    })
    .eq("id", parsed.data.attendee_id);

  if (updateError) return fail("INTERNAL");

  // 6. Discriminated result. 7. Cache invalidation per ADR-0006.
  for (const path of BOOKING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  // 8. Telemetry.
  after(async () => {
    loggerWith({ feature: "booking", event: "attendee.update" }).info(
      {
        attendee_id: parsed.data.attendee_id,
        face_pay: parsed.data.face_pay_enabled,
        auto_capture: parsed.data.auto_capture_enabled,
      },
      "updateAttendeeAction",
    );
  });

  return ok({ attendee_id: parsed.data.attendee_id });
}
