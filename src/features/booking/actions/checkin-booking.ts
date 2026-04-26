"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BOOKING_ROUTER_PATHS } from "@/features/booking/cache-tags";
import {
  BOOKING_CHECKIN_RATE_LIMIT_TOKENS,
  BOOKING_CHECKIN_RATE_LIMIT_WINDOW,
} from "@/features/booking/constants";

const limiter = createRateLimiter({
  tokens: BOOKING_CHECKIN_RATE_LIMIT_TOKENS,
  window: BOOKING_CHECKIN_RATE_LIMIT_WINDOW,
  prefix: "booking-checkin",
});

const inputSchema = z.object({
  bookingId: z.guid(),
  /**
   * Idempotency key required per CLAUDE.md §2 — prevents duplicate
   * check-ins from a flaky network or double-tap on the gate scanner.
   */
  idempotencyKey: z.guid(),
});

export type CheckinBookingInput = z.infer<typeof inputSchema>;

/**
 * Check in a booking (status → 'checked_in').
 * Requires booking:u (wider than booking:r for lookups).
 * RPC: rpc_checkin_booking(p_booking_id, p_idempotency_key)
 */
export async function checkinBookingAction(
  input: CheckinBookingInput,
): Promise<ServerActionResult<{ bookingId: string; checkedInAt: string }>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  // Check-in requires booking:u per spec
  if (!appMeta.domains?.booking?.includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data, error } = await supabase.rpc("rpc_checkin_booking", {
    p_booking_id: parsed.data.bookingId,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    if (error.message.includes("duplicate_transaction")) {
      return fail("CONFLICT", { form: "This check-in was already submitted." });
    }
    if (
      error.message.includes("NOT_FOUND") ||
      error.message.includes("not found") ||
      error.message.includes("BOOKING_NOT_FOUND")
    ) {
      return fail("NOT_FOUND");
    }
    if (error.message.includes("ALREADY_CHECKED_IN") || error.message.includes("already checked")) {
      return fail("CONFLICT");
    }
    if (
      error.message.includes("BOOKING_CANCELLED") ||
      error.message.includes("PAYMENT_NOT_COMPLETED") ||
      error.message.includes("BOOKING_ALREADY_COMPLETED")
    ) {
      return fail("CONFLICT");
    }
    return fail("INTERNAL");
  }

  const checkedInAt =
    (data as { checked_in_at?: string } | null)?.checked_in_at ?? new Date().toISOString();

  for (const path of BOOKING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "booking", event: "checkin", user_id: user.id }).info(
      { bookingId: parsed.data.bookingId },
      "checkinBookingAction completed",
    );
  });

  return ok({ bookingId: parsed.data.bookingId, checkedInAt });
}
