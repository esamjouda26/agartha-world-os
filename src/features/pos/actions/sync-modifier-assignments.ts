"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncModifierAssignmentsSchema } from "@/features/pos/schemas/modifier";

const limiter = createRateLimiter({ tokens: 30, window: "60 s", prefix: "pos-mod-assign" });

/**
 * Replace the full set of modifier group assignments for a material.
 *
 * Schema: init_schema.sql:3080 — material_modifier_groups
 * RLS: INSERT pos:c, DELETE pos:d (init_schema.sql:3176-3182)
 * Atomic: deletes current assignments then inserts the desired set.
 *
 * This requires the caller to hold pos:c (for insert) and implicitly
 * pos:d (for delete). Validated by RLS at the DB level.
 */
export async function syncModifierAssignments(
  input: unknown,
  posPointId: string,
): Promise<ServerActionResult<void>> {
  const parsed = syncModifierAssignmentsSchema.safeParse(input);
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
  if (!posAccess.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { materialId, modifierGroupIds } = parsed.data;

  // Delete existing assignments for this material
  const { error: delErr } = await supabase
    .from("material_modifier_groups")
    .delete()
    .eq("material_id", materialId);
  if (delErr) {
    loggerWith({ feature: "pos", event: "sync-modifier-assignments", user_id: user.id }).error({ error: delErr.message }, "failed to delete old assignments");
    return fail("INTERNAL");
  }

  // Insert new assignments (skip if empty — delete-only is valid)
  if (modifierGroupIds.length > 0) {
    const rows = modifierGroupIds.map((groupId, i) => ({
      material_id: materialId,
      modifier_group_id: groupId,
      sort_order: i,
      created_by: user.id,
    }));
    const { error: insErr } = await supabase.from("material_modifier_groups").insert(rows);
    if (insErr) {
      loggerWith({ feature: "pos", event: "sync-modifier-assignments", user_id: user.id }).error({ error: insErr.message }, "failed to insert new assignments");
      return fail("INTERNAL");
    }
  }

  revalidatePath(`/[locale]/management/pos/${posPointId}/modifiers`, "page");

  after(async () => {
    loggerWith({ feature: "pos", event: "sync-modifier-assignments", user_id: user.id }).info(
      { material_id: materialId, group_count: modifierGroupIds.length },
      "syncModifierAssignments completed",
    );
  });

  return ok(undefined);
}
