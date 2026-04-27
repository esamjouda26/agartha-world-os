"use server";

import "server-only";

import { after } from "next/server";
import { headers } from "next/headers";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  getAvailableSlotsSchema,
  type GetAvailableSlotsInput,
} from "@/features/booking/schemas/booking-wizard";
import type { AvailableSlot } from "@/features/booking/types/wizard";

/**
 * Anon-callable wrapper around `rpc_get_available_slots` (init_schema.sql:5268).
 * Used by the `/book` wizard client when the guest picks a date.
 *
 * Rate-limited per IP — the RPC is cheap but fires once per date change and
 * needs to be safe behind the public anon key.
 */
const limiter = createRateLimiter({
  // 30/min/IP is generous for honest usage (date-bouncing) and tight enough
  // to make scraper enumeration of the slot grid uncomfortable.
  tokens: 30,
  window: "60 s",
  prefix: "guest-slots",
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

export async function getAvailableSlotsAction(
  input: GetAvailableSlotsInput,
): Promise<ServerActionResult<readonly AvailableSlot[]>> {
  // 1. Validate.
  const parsed = getAvailableSlotsSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  // 2. Auth — anonymous; no auth check required.
  // 3. Rate limit by IP (guests have no user id).
  const ip = await clientIp();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Idempotency — read-only RPC, no idempotency key needed.
  // 5. Execute via anon-key client (RPC is GRANTed to anon — init_schema.sql:5322).
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_available_slots", parsed.data);

  if (error) {
    if (error.message.includes("EXPERIENCE_NOT_FOUND")) {
      return fail("NOT_FOUND", { p_experience_id: "Experience not found." });
    }
    if (error.message.includes("TIER_NOT_FOUND")) {
      return fail("NOT_FOUND", { p_tier_id: "Tier not found for this experience." });
    }
    if (error.message.includes("INVALID_GUEST_COUNT")) {
      return fail("VALIDATION_FAILED", { p_guest_count: "Guest count must be at least 1." });
    }
    return fail("INTERNAL");
  }

  // The RPC returns a JSONB array of slot rows; the generated TS types it as
  // `Json`. Narrow it via an `unknown` indirection — the AvailableSlot
  // shape is asserted by the RPC body itself (init_schema.sql:5285).
  const slots = Array.isArray(data) ? (data as unknown as readonly AvailableSlot[]) : [];

  // 6. Return discriminated union (ok/fail).
  // 7. No cache invalidation — read-only.
  // 8. Telemetry.
  after(async () => {
    loggerWith({ feature: "booking", event: "slots.read" }).info(
      { date: parsed.data.p_date, count: slots.length },
      "getAvailableSlotsAction",
    );
  });

  return ok(slots);
}
