"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROCUREMENT_ROUTER_PATHS } from "@/features/procurement/cache-tags";
import {
  LOCATION_CATEGORY_ASSIGN_RATE_TOKENS,
  LOCATION_CATEGORY_ASSIGN_RATE_WINDOW,
} from "@/features/procurement/constants";
import { updateCategoryAllowedLocationsSchema } from "@/features/procurement/schemas/material-category";

const limiter = createRateLimiter({
  tokens: LOCATION_CATEGORY_ASSIGN_RATE_TOKENS,
  window: LOCATION_CATEGORY_ASSIGN_RATE_WINDOW,
  prefix: "procurement-category-allowed-locations",
});

/**
 * Apply add + remove deltas to the `location_allowed_categories` junction
 * for a single category (category-as-owner shape). Underlying junction
 * row is (location_id, category_id).
 *
 * RLS on this table requires `system:c` for INSERT and `system:d` for
 * DELETE (init_schema.sql:1271-1280) — this OVERRIDES the spec's
 * "procurement OR pos" gate (migrations win precedence over
 * frontend_spec.md per CLAUDE.md). The categories page renders for
 * procurement|pos users; only the assign control gates on `system`.
 */
export async function updateCategoryAllowedLocations(
  input: unknown,
): Promise<
  ServerActionResult<{ categoryId: string; added: number; removed: number }>
> {
  // 1. Zod parse
  const parsed = updateCategoryAllowedLocationsSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — junction is system-scoped per RLS
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const sys = appMeta.domains?.system ?? [];
  const needsAdd = parsed.data.addLocationIds.length > 0;
  const needsRemove = parsed.data.removeLocationIds.length > 0;
  if (needsAdd && !sys.includes("c")) return fail("FORBIDDEN");
  if (needsRemove && !sys.includes("d")) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { categoryId, addLocationIds, removeLocationIds } = parsed.data;

  // 4. INSERT new junction rows (idempotent via ignoreDuplicates). With
  //    ignoreDuplicates the inserted-count is unreliable (PostgREST
  //    returns 0 even for newly inserted rows in some versions), so we
  //    report `attempted` here — the desired end-state is reached either
  //    way.
  let added = 0;
  if (addLocationIds.length > 0) {
    const rows = addLocationIds.map((locationId) => ({
      location_id: locationId,
      category_id: categoryId,
      created_by: user.id,
    }));
    const { error: addErr } = await supabase
      .from("location_allowed_categories")
      .upsert(rows, {
        onConflict: "location_id,category_id",
        ignoreDuplicates: true,
      });
    if (addErr) {
      const log = loggerWith({
        feature: "procurement",
        event: "update_category_allowed_locations",
        user_id: user.id,
      });
      log.error(
        { code: addErr.code, message: addErr.message },
        "junction INSERT failed",
      );
      return fail("INTERNAL");
    }
    added = addLocationIds.length;
  }

  // 5. DELETE removed junction rows. `.delete({count:"exact"})` is the
  //    canonical chain for write counts (precedent: announcements/actions).
  let removed = 0;
  if (removeLocationIds.length > 0) {
    const { error: delErr, count } = await supabase
      .from("location_allowed_categories")
      .delete({ count: "exact" })
      .eq("category_id", categoryId)
      .in("location_id", removeLocationIds);
    if (delErr) {
      const log = loggerWith({
        feature: "procurement",
        event: "update_category_allowed_locations",
        user_id: user.id,
      });
      log.error(
        { code: delErr.code, message: delErr.message },
        "junction DELETE failed",
      );
      return fail("INTERNAL");
    }
    removed = count ?? 0;
  }

  // 6. Invalidate cache
  for (const p of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "update_category_allowed_locations",
      user_id: user.id,
    });
    log.info(
      { category_id: categoryId, added, removed },
      "updateCategoryAllowedLocations completed",
    );
  });

  return ok({ categoryId, added, removed });
}
