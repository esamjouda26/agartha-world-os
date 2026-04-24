"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ZONES_ROUTER_PATHS } from "@/features/zones/cache-tags";
import { assignCategoriesSchema, unassignCategoriesSchema } from "@/features/zones/schemas/zone";

const limiter = createRateLimiter({ tokens: 30, window: "60 s", prefix: "zones-categories" });

/** Bulk-assign material categories to a location. */
export async function assignCategories(
  input: unknown,
): Promise<ServerActionResult<{ count: number }>> {
  const parsed = assignCategoriesSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!(appMeta.domains?.system ?? []).includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const rows = parsed.data.categoryIds.map((categoryId) => ({
    location_id: parsed.data.locationId,
    category_id: categoryId,
    created_by: user.id,
  }));

  const { error } = await supabase
    .from("location_allowed_categories")
    .upsert(rows, { onConflict: "location_id,category_id", ignoreDuplicates: true });

  if (error) return fail("INTERNAL");

  for (const path of ZONES_ROUTER_PATHS) revalidatePath(path, "page");

  after(async () => {
    loggerWith({ feature: "zones", event: "assign-categories", user_id: user.id }).info(
      { location_id: parsed.data.locationId, count: parsed.data.categoryIds.length },
      "categories assigned",
    );
  });

  return ok({ count: parsed.data.categoryIds.length });
}

/** Bulk-unassign material categories from a location. */
export async function unassignCategories(
  input: unknown,
): Promise<ServerActionResult<{ count: number }>> {
  const parsed = unassignCategoriesSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!(appMeta.domains?.system ?? []).includes("d")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("location_allowed_categories")
    .delete()
    .eq("location_id", parsed.data.locationId)
    .in("category_id", parsed.data.categoryIds);

  if (error) return fail("INTERNAL");

  for (const path of ZONES_ROUTER_PATHS) revalidatePath(path, "page");

  after(async () => {
    loggerWith({ feature: "zones", event: "unassign-categories", user_id: user.id }).info(
      { location_id: parsed.data.locationId, count: parsed.data.categoryIds.length },
      "categories unassigned",
    );
  });

  return ok({ count: parsed.data.categoryIds.length });
}
