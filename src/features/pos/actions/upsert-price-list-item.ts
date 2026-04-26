"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { posPriceListDetailPath } from "@/features/pos/cache-tags";
import { upsertPriceListItemSchema } from "@/features/pos/schemas/price-list-item";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "pos-price-list-item" });

/**
 * Create or update a price_list_item.
 * Schema: init_schema.sql:2277 — price_list_items
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:2431-2435)
 */
export async function upsertPriceListItem(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = upsertPriceListItemSchema.safeParse(input);
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

  const { id, priceListId, materialId, posPointId, unitPrice, minQty } = parsed.data;
  let resultId: string;

  if (isUpdate && id) {
    const { data, error } = await supabase
      .from("price_list_items")
      .update({
        material_id: materialId,
        pos_point_id: posPointId ?? null,
        unit_price: unitPrice,
        min_qty: minQty,
        updated_by: user.id,
      })
      .eq("id", id)
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-price-list-item", user_id: user.id }).error(
        { error: error?.message },
        "failed to update price_list_item",
      );
      return fail("INTERNAL");
    }
    resultId = data.id;
  } else {
    const { data, error } = await supabase
      .from("price_list_items")
      .insert({
        price_list_id: priceListId,
        material_id: materialId,
        pos_point_id: posPointId ?? null,
        unit_price: unitPrice,
        min_qty: minQty,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-price-list-item", user_id: user.id }).error(
        { error: error?.message },
        "failed to insert price_list_item",
      );
      return fail("INTERNAL");
    }
    resultId = data.id;
  }

  revalidatePath(posPriceListDetailPath(priceListId), "page");

  after(async () => {
    loggerWith({ feature: "pos", event: "upsert-price-list-item", user_id: user.id }).info(
      { id: resultId, price_list_id: priceListId },
      "upsertPriceListItem completed",
    );
  });

  return ok({ id: resultId });
}
