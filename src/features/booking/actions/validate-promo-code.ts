"use server";

import "server-only";

import { after } from "next/server";
import { headers } from "next/headers";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  validatePromoCodeSchema,
  type ValidatePromoCodeInput,
} from "@/features/booking/schemas/booking-wizard";
import type { PromoValidation } from "@/features/booking/types/wizard";

/**
 * Anon-callable wrapper around `rpc_validate_promo_code` (init_schema.sql:5325).
 * Read-only — the RPC does NOT increment `current_uses`; that happens only
 * inside `rpc_create_booking`'s transaction.
 *
 * Called from `<PromoCodeInput>` after a 300ms debounce. Returns the same
 * shape the RPC does (valid + price preview, or invalid + reason) — the
 * client renders the discount inline without a toast.
 */
const limiter = createRateLimiter({
  // 20/min/IP — generous for honest typing, tight enough to discourage
  // brute-force enumeration of valid codes.
  tokens: 20,
  window: "60 s",
  prefix: "guest-promo",
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

export async function validatePromoCodeAction(
  input: ValidatePromoCodeInput,
): Promise<ServerActionResult<PromoValidation>> {
  const parsed = validatePromoCodeSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const ip = await clientIp();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_validate_promo_code", parsed.data);

  if (error) {
    return fail("INTERNAL");
  }

  // The RPC returns a JSONB object — `valid: boolean` discriminator decides
  // which branch of PromoValidation we cast to. Narrow defensively.
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fail("INTERNAL");
  }
  const validation = data as PromoValidation;

  after(async () => {
    loggerWith({ feature: "booking", event: "promo.validate" }).info(
      validation.valid
        ? { promo_code: validation.promo_code, valid: true }
        : { promo_code: parsed.data.p_promo_code, valid: false, reason: validation.reason },
      "validatePromoCodeAction",
    );
  });

  return ok(validation);
}
