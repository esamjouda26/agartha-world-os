"use server";

import "server-only";

import { after } from "next/server";

import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
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

const inputSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
});

/**
 * Search bookings by email.
 * RPC: rpc_search_bookings_by_email(p_email)
 * init_schema.sql:5608
 */
export async function searchBookingsByEmailAction(
  email: string,
): Promise<ServerActionResult<ReadonlyArray<BookingSearchResult>>> {
  const parsed = inputSchema.safeParse({ email });
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
  if (!appMeta.domains?.booking?.includes("r")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data, error } = await supabase.rpc("rpc_search_bookings_by_email", {
    p_email: parsed.data.email,
  });

  if (error) return fail("INTERNAL");

  const results = (data ?? []) as unknown as ReadonlyArray<BookingSearchResult>;

  after(async () => {
    loggerWith({ feature: "booking", event: "search_by_email", user_id: user.id }).info(
      { match_count: results.length },
      "searchBookingsByEmailAction completed",
    );
  });

  return ok(results);
}
