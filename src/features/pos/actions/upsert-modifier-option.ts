"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertModifierOptionSchema } from "@/features/pos/schemas/modifier";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "pos-modifier-option" });

/**
 * Create or update a pos_modifier_option.
 * Schema: init_schema.sql:3063 — pos_modifier_options
 * UNIQUE (group_id, name) enforced by DB (init_schema.sql:3076).
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:3165-3169)
 *
 * priceDelta received as decimal MYR from form; stored as NUMERIC in DB.
 */
export async function upsertModifierOption(
  input: unknown,
  posPointId: string,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = upsertModifierOptionSchema.safeParse(input);
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

  const { id, groupId, name, priceDelta, materialId, quantityDelta, sortOrder, isActive } = parsed.data;
  let resultId: string;

  if (isUpdate && id) {
    const { data, error } = await supabase
      .from("pos_modifier_options")
      .update({ name, price_delta: priceDelta, material_id: materialId ?? null, quantity_delta: quantityDelta, sort_order: sortOrder, is_active: isActive, updated_by: user.id })
      .eq("id", id)
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-modifier-option", user_id: user.id }).error({ error: error?.message }, "failed to update modifier option");
      return fail("INTERNAL");
    }
    resultId = data.id;
  } else {
    const { data, error } = await supabase
      .from("pos_modifier_options")
      .insert({ group_id: groupId, name, price_delta: priceDelta, material_id: materialId ?? null, quantity_delta: quantityDelta, sort_order: sortOrder, is_active: isActive, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-modifier-option", user_id: user.id }).error({ error: error?.message }, "failed to insert modifier option");
      return fail("INTERNAL");
    }
    resultId = data.id;
  }

  revalidatePath(`/[locale]/management/pos/${posPointId}/modifiers`, "page");

  after(async () => {
    loggerWith({ feature: "pos", event: "upsert-modifier-option", user_id: user.id }).info({ id: resultId, group_id: groupId }, "upsertModifierOption completed");
  });

  return ok({ id: resultId });
}
