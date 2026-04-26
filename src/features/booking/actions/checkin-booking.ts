"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

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

/**
 * Check in a booking (status → 'checked_in').
 * Requires booking:u (wider than booking:r for lookups).
 * RPC: rpc_checkin_booking(p_booking_id)
 * init_schema.sql:5625
 */
export async function checkinBookingAction(
  bookingId: string,
): Promise<ServerActionResult<{ bookingId: string; checkedInAt: string }>> {
  if (!bookingId) return fail("VALIDATION_FAILED", { bookingId: "Booking ID is required" });

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
    p_booking_id: bookingId,
  });

  if (error) {
    if (error.message.includes("NOT_FOUND") || error.message.includes("not found")) {
      return fail("NOT_FOUND");
    }
    if (error.message.includes("already checked")) return fail("CONFLICT");
    return fail("INTERNAL");
  }

  const checkedInAt = (data as { checked_in_at?: string } | null)?.checked_in_at ?? new Date().toISOString();

  for (const path of BOOKING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "booking", event: "checkin", user_id: user.id }).info(
      { bookingId },
      "checkinBookingAction completed",
    );
  });

  return ok({ bookingId, checkedInAt });
}
