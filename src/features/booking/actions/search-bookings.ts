"use server";

import "server-only";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BOOKING_LOOKUP_RATE_LIMIT_TOKENS,
  BOOKING_LOOKUP_RATE_LIMIT_WINDOW,
} from "@/features/booking/constants";
import type { BookingSearchResult } from "@/features/booking/types";

const limiter = createRateLimiter({
  tokens: BOOKING_LOOKUP_RATE_LIMIT_TOKENS,
  window: BOOKING_LOOKUP_RATE_LIMIT_WINDOW,
  prefix: "booking-search",
});

/**
 * Search bookings by email.
 * RPC: rpc_search_bookings_by_email(p_email)
 * init_schema.sql:5608
 */
export async function searchBookingsByEmailAction(
  email: string,
): Promise<ServerActionResult<ReadonlyArray<BookingSearchResult>>> {
  if (!email.trim()) {
    return fail("VALIDATION_FAILED", { email: "Email is required" });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!appMeta.domains?.booking?.includes("r")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data, error } = await supabase.rpc("rpc_search_bookings_by_email", {
    p_email: email,
  });

  if (error) return fail("INTERNAL");

  return ok((data ?? []) as unknown as ReadonlyArray<BookingSearchResult>);
}
