"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POS_ROUTER_PATHS, posPriceListDetailPath } from "@/features/pos/cache-tags";
import { upsertPriceListSchema } from "@/features/pos/schemas/price-list";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "pos-price-list" });

/**
 * Create or update a price_list.
 * Schema: init_schema.sql:2264 — price_lists
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:2420-2424)
 */
export async function upsertPriceList(
  input: unknown,
): Promise<ServerActionResult<{ priceListId: string }>> {
  const parsed = upsertPriceListSchema.safeParse(input);
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
  const posAccess = appMeta.domains?.pos ?? [];
  const isUpdate = Boolean(parsed.data.id);
  if (isUpdate && !posAccess.includes("u")) return fail("FORBIDDEN");
  if (!isUpdate && !posAccess.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { id, name, currency, validFrom, validTo, isDefault } = parsed.data;
  const validToValue = validTo && validTo.length > 0 ? validTo : null;
  let resultId: string;

  if (isUpdate && id) {
    const { data, error } = await supabase
      .from("price_lists")
      .update({
        name,
        currency,
        valid_from: validFrom,
        valid_to: validToValue,
        is_default: isDefault,
        updated_by: user.id,
      })
      .eq("id", id)
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-price-list", user_id: user.id }).error(
        { error: error?.message },
        "failed to update price_list",
      );
      return fail("INTERNAL");
    }
    resultId = data.id;
  } else {
    const { data, error } = await supabase
      .from("price_lists")
      .insert({
        name,
        currency,
        valid_from: validFrom,
        valid_to: validToValue,
        is_default: isDefault,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-price-list", user_id: user.id }).error(
        { error: error?.message },
        "failed to insert price_list",
      );
      return fail("INTERNAL");
    }
    resultId = data.id;
  }

  for (const path of POS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
  if (isUpdate && id) {
    revalidatePath(posPriceListDetailPath(id), "page");
  }

  after(async () => {
    loggerWith({ feature: "pos", event: "upsert-price-list", user_id: user.id }).info(
      { price_list_id: resultId, is_update: isUpdate },
      "upsertPriceList completed",
    );
  });

  return ok({ priceListId: resultId });
}
