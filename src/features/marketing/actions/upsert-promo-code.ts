"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MARKETING_ROUTER_PATHS } from "@/features/marketing/cache-tags";
import {
  MARKETING_CRUD_RATE_TOKENS,
  MARKETING_CRUD_RATE_WINDOW,
} from "@/features/marketing/constants";
import { upsertPromoCodeSchema } from "@/features/marketing/schemas/upsert-promo-code";

const limiter = createRateLimiter({
  tokens: MARKETING_CRUD_RATE_TOKENS,
  window: MARKETING_CRUD_RATE_WINDOW,
  prefix: "marketing-upsert-promo-code",
});

/**
 * INSERT/UPDATE a promo code and synchronously sync its valid-tier
 * junction. Calls `rpc_upsert_promo_code` so both the promo_codes
 * mutation and the promo_valid_tiers DELETE/INSERT happen in one
 * transaction — required by CLAUDE.md §4 because two related tables
 * are mutated. The companion migration registers the RPC.
 *
 * INSERT requires `marketing:c`; UPDATE requires `marketing:u`. RLS
 * mirrors at init_schema.sql:3779-3799, so the RPC's SECURITY DEFINER
 * does NOT bypass authorization — it only ensures atomicity.
 */
export async function upsertPromoCode(
  input: unknown,
): Promise<ServerActionResult<{ promoCodeId: string }>> {
  const parsed = upsertPromoCodeSchema.safeParse(input);
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

  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const isUpdate = Boolean(parsed.data.id);
  const requiredAccess = isUpdate ? "u" : "c";
  if (!appMeta.domains?.marketing?.includes(requiredAccess)) {
    return fail("FORBIDDEN");
  }

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;

  // Generated RPC types over-restrict NULL-accepting parameters (Supabase
  // type generator emits non-null types for SQL params without explicit
  // NOT NULL). Cast nullable args to satisfy the strict signature — the
  // SQL function accepts NULL for every parameter listed below per the
  // migration definition.
  const { data: promoId, error: rpcErr } = await supabase.rpc("rpc_upsert_promo_code", {
    p_id: (d.id ?? null) as string,
    p_code: d.code.toUpperCase(),
    p_description: (d.description ?? null) as string,
    p_discount_type: d.discountType,
    p_discount_value: d.discountValue,
    p_max_uses: (d.maxUses ?? null) as number,
    p_campaign_id: (d.campaignId ?? null) as string,
    p_status: d.status,
    p_valid_from: d.validFrom,
    p_valid_to: d.validTo,
    p_valid_days_mask: (d.validDaysMask ?? null) as number,
    p_valid_time_start: (d.validTimeStart ?? null) as string,
    p_valid_time_end: (d.validTimeEnd ?? null) as string,
    p_min_group_size: d.minGroupSize,
    p_tier_ids: [...d.tierIds],
    p_actor_id: user.id,
  });

  if (rpcErr || typeof promoId !== "string") {
    const log = loggerWith({
      feature: "marketing",
      event: isUpdate ? "update_promo_code" : "create_promo_code",
      user_id: user.id,
    });

    if (rpcErr?.message === "duplicate_code") {
      return fail("CONFLICT", { code: "Code already exists" });
    }
    if (rpcErr?.message === "not_found") {
      return fail("NOT_FOUND");
    }

    log.error({ code: rpcErr?.code, message: rpcErr?.message }, "rpc_upsert_promo_code failed");
    return fail("INTERNAL");
  }

  for (const path of MARKETING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "marketing",
      event: isUpdate ? "update_promo_code" : "create_promo_code",
      user_id: user.id,
    }).info({ promoCodeId: promoId }, "upsertPromoCode completed");
  });

  return ok({ promoCodeId: promoId });
}
