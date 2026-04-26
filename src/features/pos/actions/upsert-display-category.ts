"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { posPosPointDetailPath } from "@/features/pos/cache-tags";
import { upsertDisplayCategorySchema } from "@/features/pos/schemas/display-category";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "pos-display-cat" });

/**
 * Create or update a display_category row.
 *
 * Schema: init_schema.sql:2154 — display_categories
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:2388-2391)
 * UNIQUE (pos_point_id, name) enforced by DB.
 */
export async function upsertDisplayCategory(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = upsertDisplayCategorySchema.safeParse(input);
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

  const { id, posPointId, name, sortOrder } = parsed.data;
  let resultId: string;

  if (isUpdate && id) {
    const { data, error } = await supabase
      .from("display_categories")
      .update({ name, sort_order: sortOrder, updated_by: user.id })
      .eq("id", id)
      .eq("pos_point_id", posPointId)
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-display-category", user_id: user.id }).error(
        { error: error?.message },
        "failed to update display_category",
      );
      return fail("INTERNAL");
    }
    resultId = data.id;
  } else {
    const { data, error } = await supabase
      .from("display_categories")
      .insert({ pos_point_id: posPointId, name, sort_order: sortOrder, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-display-category", user_id: user.id }).error(
        { error: error?.message },
        "failed to insert display_category",
      );
      return fail("INTERNAL");
    }
    resultId = data.id;
  }

  revalidatePath(posPosPointDetailPath(posPointId), "page");

  after(async () => {
    loggerWith({ feature: "pos", event: "upsert-display-category", user_id: user.id }).info(
      { id: resultId, pos_point_id: posPointId },
      "upsertDisplayCategory completed",
    );
  });

  return ok({ id: resultId });
}
