"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MARKETING_ROUTER_PATHS } from "@/features/marketing/cache-tags";
import {
  MARKETING_CRUD_RATE_TOKENS,
  MARKETING_CRUD_RATE_WINDOW,
} from "@/features/marketing/constants";

const schema = z.object({ promoCodeId: z.guid() });

const limiter = createRateLimiter({
  tokens: MARKETING_CRUD_RATE_TOKENS,
  window: MARKETING_CRUD_RATE_WINDOW,
  prefix: "marketing-delete-promo-code",
});

/**
 * DELETE a promo code. Spec line 2587 — only allowed on draft or expired
 * promos and gated by `marketing:d`. The "draft or expired" filter is
 * enforced at the row level: status = 'draft' OR valid_to < NOW().
 *
 * `promo_valid_tiers.promo_code_id` is ON DELETE CASCADE
 * (init_schema.sql:3753) so the junction rows are removed automatically
 * — no separate transaction needed.
 *
 * Bookings carry `promo_code_id` with ON DELETE SET NULL (init_schema.sql
 * :3761-3762) so historical bookings keep their amounts but lose the
 * reference. This is intentional per the spec — no usage gate.
 */
export async function deletePromoCode(
  input: unknown,
): Promise<ServerActionResult<{ promoCodeId: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.marketing?.includes("d")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Server-side enforcement of "draft or expired only" — the .delete()
  // .or() filter restricts the row scope so a stale UI cannot delete an
  // active or paused promo even with marketing:d.
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("promo_codes")
    .delete()
    .eq("id", parsed.data.promoCodeId)
    .or(`status.eq.draft,valid_to.lt.${nowIso}`)
    .select("id")
    .maybeSingle();

  if (error) return fail("INTERNAL");
  if (!data) return fail("CONFLICT", { form: "Only draft or expired promos can be deleted" });

  for (const path of MARKETING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "marketing",
      event: "delete_promo_code",
      user_id: user.id,
    }).info({ promoCodeId: parsed.data.promoCodeId }, "deletePromoCode completed");
  });

  return ok({ promoCodeId: parsed.data.promoCodeId });
}
