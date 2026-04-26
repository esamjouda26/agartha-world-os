"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertModifierGroupSchema } from "@/features/pos/schemas/modifier";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "pos-modifier-group" });

/**
 * Create or update a pos_modifier_group.
 * Schema: init_schema.sql:3049 — pos_modifier_groups (global, no pos_point_id)
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:3154-3158)
 *
 * Note: caller must pass posPointId separately to revalidate the detail page.
 */
export async function upsertModifierGroup(
  input: unknown,
  posPointId: string,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = upsertModifierGroupSchema.safeParse(input);
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

  const { id, name, displayName, minSelections, maxSelections, sortOrder, isActive } = parsed.data;
  let resultId: string;

  if (isUpdate && id) {
    const { data, error } = await supabase
      .from("pos_modifier_groups")
      .update({ name, display_name: displayName, min_selections: minSelections, max_selections: maxSelections, sort_order: sortOrder, is_active: isActive, updated_by: user.id })
      .eq("id", id)
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-modifier-group", user_id: user.id }).error({ error: error?.message }, "failed to update modifier group");
      return fail("INTERNAL");
    }
    resultId = data.id;
  } else {
    const { data, error } = await supabase
      .from("pos_modifier_groups")
      .insert({ name, display_name: displayName, min_selections: minSelections, max_selections: maxSelections, sort_order: sortOrder, is_active: isActive, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-modifier-group", user_id: user.id }).error({ error: error?.message }, "failed to insert modifier group");
      return fail("INTERNAL");
    }
    resultId = data.id;
  }

  revalidatePath(`/[locale]/management/pos/${posPointId}/modifiers`, "page");

  after(async () => {
    loggerWith({ feature: "pos", event: "upsert-modifier-group", user_id: user.id }).info({ id: resultId }, "upsertModifierGroup completed");
  });

  return ok({ id: resultId });
}
