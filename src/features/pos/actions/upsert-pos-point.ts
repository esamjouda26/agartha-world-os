"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POS_ROUTER_PATHS, posPosPointDetailPath } from "@/features/pos/cache-tags";
import { upsertPosPointSchema } from "@/features/pos/schemas/pos-point";

// ── Rate limiter ─────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: 60,
  window: "60 s",
  prefix: "pos-point-upsert",
});

// ── Action ───────────────────────────────────────────────────────────────

/**
 * Create or update a POS point — 8-step pipeline per prompt.md.
 *
 * Schema: init_schema.sql:1079 — pos_points
 * RLS: INSERT requires system:c, UPDATE requires system:u (init_schema.sql:1285-1289)
 */
export async function upsertPosPoint(
  input: unknown,
): Promise<ServerActionResult<{ posPointId: string }>> {
  // 1. Zod parse
  const parsed = upsertPosPointSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — pos_points require system:c (insert) or system:u (update)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const systemAccess = appMeta.domains?.system ?? [];
  const isUpdate = Boolean(parsed.data.id);

  if (isUpdate && !systemAccess.includes("u")) return fail("FORBIDDEN");
  if (!isUpdate && !systemAccess.includes("c")) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. No idempotency key required (non-critical, low-volume config mutation)

  // 5. Execute mutation
  const { id, name, displayName, locationId, isActive } = parsed.data;
  let posPointId: string;

  if (isUpdate && id) {
    const { data, error } = await supabase
      .from("pos_points")
      .update({
        name,
        display_name: displayName,
        location_id: locationId,
        is_active: isActive,
        updated_by: user.id,
      })
      .eq("id", id)
      .select("id")
      .single();

    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-pos-point", user_id: user.id }).error(
        { error: error?.message, code: error?.code },
        "failed to update pos_point",
      );
      return fail("INTERNAL");
    }
    posPointId = data.id;
  } else {
    const { data, error } = await supabase
      .from("pos_points")
      .insert({
        name,
        display_name: displayName,
        location_id: locationId,
        is_active: isActive,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-pos-point", user_id: user.id }).error(
        { error: error?.message, code: error?.code },
        "failed to insert pos_point",
      );
      return fail("INTERNAL");
    }
    posPointId = data.id;
  }

  // 6. Invalidate cache — surgical per ADR-0006
  for (const path of POS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
  // Also bust the detail page for updates
  if (isUpdate && id) {
    revalidatePath(posPosPointDetailPath(id), "page");
  }

  // 7. (revalidatePath done above)

  // 8. Structured log — post-response via after()
  after(async () => {
    loggerWith({ feature: "pos", event: "upsert-pos-point", user_id: user.id }).info(
      { pos_point_id: posPointId, is_update: isUpdate },
      "upsertPosPoint completed",
    );
  });

  return ok({ posPointId });
}
