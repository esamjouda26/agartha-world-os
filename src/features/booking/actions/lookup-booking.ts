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
import type { BookingLookupResult } from "@/features/booking/types";

const limiter = createRateLimiter({
  tokens: BOOKING_LOOKUP_RATE_LIMIT_TOKENS,
  window: BOOKING_LOOKUP_RATE_LIMIT_WINDOW,
  prefix: "booking-lookup",
});

const inputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("qr"), value: z.string().trim().min(1, "QR code is required") }),
  z.object({ kind: z.literal("ref"), value: z.string().trim().min(1, "Booking ref is required") }),
]);

type LookupInput = z.infer<typeof inputSchema>;

/**
 * Look up a booking by QR code or booking ref.
 * RPCs: rpc_lookup_booking(p_qr_code_ref, p_booking_ref)
 * init_schema.sql:5587
 */
export async function lookupBookingAction(
  input: LookupInput,
): Promise<ServerActionResult<BookingLookupResult>> {
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
  if (!appMeta.domains?.booking?.includes("r")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const args =
    parsed.data.kind === "qr"
      ? { p_qr_code_ref: parsed.data.value }
      : { p_booking_ref: parsed.data.value };

  const { data, error } = await supabase.rpc("rpc_lookup_booking", args);

  if (error) return fail("INTERNAL");
  if (!data) return fail("NOT_FOUND");

  after(async () => {
    loggerWith({ feature: "booking", event: "lookup", user_id: user.id }).info(
      { kind: parsed.data.kind },
      "lookupBookingAction completed",
    );
  });

  return ok(data as unknown as BookingLookupResult);
}
