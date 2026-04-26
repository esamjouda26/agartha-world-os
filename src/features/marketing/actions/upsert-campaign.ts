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
import { upsertCampaignSchema } from "@/features/marketing/schemas/upsert-campaign";

const limiter = createRateLimiter({
  tokens: MARKETING_CRUD_RATE_TOKENS,
  window: MARKETING_CRUD_RATE_WINDOW,
  prefix: "marketing-upsert-campaign",
});

/**
 * INSERT or UPDATE a campaign per /management/marketing/campaigns
 * (frontend_spec.md:2520-2558). Pipeline mirrors CLAUDE.md §4.
 *
 * INSERT requires `marketing:c`; UPDATE requires `marketing:u`. RLS
 * (init_schema.sql:3771-3777) repeats the gate row-side.
 */
export async function upsertCampaign(
  input: unknown,
): Promise<ServerActionResult<{ campaignId: string }>> {
  const parsed = upsertCampaignSchema.safeParse(input);
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
  const payload = {
    name: d.name,
    description: d.description,
    status: d.status,
    budget: d.budget,
    start_date: d.startDate,
    end_date: d.endDate,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  let campaignId: string;
  if (isUpdate && d.id) {
    const { data, error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", d.id)
      .select("id")
      .single();
    if (error) return fail("INTERNAL");
    if (!data) return fail("NOT_FOUND");
    campaignId = data.id;
  } else {
    const { data, error } = await supabase
      .from("campaigns")
      .insert({ ...payload, created_by: user.id })
      .select("id")
      .single();
    if (error) return fail("INTERNAL");
    campaignId = data.id;
  }

  for (const path of MARKETING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "marketing",
      event: isUpdate ? "update_campaign" : "create_campaign",
      user_id: user.id,
    }).info({ campaignId }, "upsertCampaign completed");
  });

  return ok({ campaignId });
}
