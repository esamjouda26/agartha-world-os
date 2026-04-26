"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POS_ROUTER_PATHS, posBomDetailPath } from "@/features/pos/cache-tags";
import { activateBomSchema } from "@/features/pos/schemas/bom";

const limiter = createRateLimiter({ tokens: 20, window: "60 s", prefix: "pos-bom-activate" });

/**
 * Activate a BOM (status='draft' → 'active'). Sets is_default=TRUE and
 * obsoletes the previous active+default version for the same parent material.
 *
 * Schema: init_schema.sql:2225 — bill_of_materials
 * RLS: UPDATE pos:u (init_schema.sql:2400-2402)
 * Partial unique idx idx_bom_one_active_default enforces single active+default.
 */
export async function activateBom(
  input: unknown,
): Promise<ServerActionResult<{ bomId: string }>> {
  const parsed = activateBomSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!appMeta.domains?.pos?.includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { bomId } = parsed.data;

  // 1. Read target BOM (must be draft)
  const { data: target, error: tgtErr } = await supabase
    .from("bill_of_materials")
    .select("parent_material_id, status")
    .eq("id", bomId)
    .maybeSingle();
  if (tgtErr) return fail("INTERNAL");
  if (!target) return fail("NOT_FOUND");
  if (target.status !== "draft") return fail("CONFLICT");

  // 2. Obsolete the previous active+default for the same parent
  const { error: obsErr } = await supabase
    .from("bill_of_materials")
    .update({ status: "obsolete", is_default: false, updated_by: user.id })
    .eq("parent_material_id", target.parent_material_id)
    .eq("status", "active")
    .eq("is_default", true);

  if (obsErr) {
    loggerWith({ feature: "pos", event: "activate-bom", user_id: user.id }).error(
      { error: obsErr.message },
      "failed to obsolete previous default",
    );
    return fail("INTERNAL");
  }

  // 3. Activate the target
  const { error: actErr } = await supabase
    .from("bill_of_materials")
    .update({
      status: "active",
      is_default: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", bomId);

  if (actErr) {
    loggerWith({ feature: "pos", event: "activate-bom", user_id: user.id }).error(
      { error: actErr.message, code: actErr.code },
      "failed to activate BOM",
    );
    if (actErr.code === "23505") return fail("CONFLICT");
    return fail("INTERNAL");
  }

  for (const path of POS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
  revalidatePath(posBomDetailPath(bomId), "page");

  after(async () => {
    loggerWith({ feature: "pos", event: "activate-bom", user_id: user.id }).info(
      { bom_id: bomId, parent_material_id: target.parent_material_id },
      "activateBom completed",
    );
  });

  return ok({ bomId });
}
