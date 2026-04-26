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

const schema = z.object({ campaignId: z.guid() });

const limiter = createRateLimiter({
  tokens: MARKETING_CRUD_RATE_TOKENS,
  window: MARKETING_CRUD_RATE_WINDOW,
  prefix: "marketing-delete-campaign",
});

/**
 * DELETE a campaign. Gated by `marketing:d` per spec line 2547. RLS
 * mirror at init_schema.sql:3776-3777.
 *
 * `promo_codes.campaign_id` is ON DELETE SET NULL (init_schema.sql:3737)
 * — promo codes survive the cascade and become unaffiliated.
 */
export async function deleteCampaign(
  input: unknown,
): Promise<ServerActionResult<{ campaignId: string }>> {
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

  const { error } = await supabase.from("campaigns").delete().eq("id", parsed.data.campaignId);

  if (error) return fail("INTERNAL");

  for (const path of MARKETING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "marketing",
      event: "delete_campaign",
      user_id: user.id,
    }).info({ campaignId: parsed.data.campaignId }, "deleteCampaign completed");
  });

  return ok({ campaignId: parsed.data.campaignId });
}
