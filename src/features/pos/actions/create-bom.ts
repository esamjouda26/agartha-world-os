"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POS_ROUTER_PATHS } from "@/features/pos/cache-tags";
import { createBomSchema } from "@/features/pos/schemas/bom";

const limiter = createRateLimiter({ tokens: 30, window: "60 s", prefix: "pos-bom-create" });

/**
 * Create a new BOM (always status='draft' until activated).
 * Schema: init_schema.sql:2225 — bill_of_materials
 * RLS: INSERT pos:c (init_schema.sql:2398-2399)
 * UNIQUE (parent_material_id, version) enforced.
 */
export async function createBom(
  input: unknown,
): Promise<ServerActionResult<{ bomId: string }>> {
  const parsed = createBomSchema.safeParse(input);
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
  if (!appMeta.domains?.pos?.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { parentMaterialId, version, effectiveFrom, effectiveTo, isDefault } = parsed.data;
  const effectiveToValue = effectiveTo && effectiveTo.length > 0 ? effectiveTo : null;

  const { data, error } = await supabase
    .from("bill_of_materials")
    .insert({
      parent_material_id: parentMaterialId,
      version,
      effective_from: effectiveFrom,
      effective_to: effectiveToValue,
      status: "draft",
      is_default: isDefault,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    loggerWith({ feature: "pos", event: "create-bom", user_id: user.id }).error(
      { error: error?.message, code: error?.code },
      "failed to create BOM",
    );
    if (error?.code === "23505") return fail("CONFLICT");
    return fail("INTERNAL");
  }

  for (const path of POS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "pos", event: "create-bom", user_id: user.id }).info(
      { bom_id: data.id, parent_material_id: parentMaterialId, version },
      "createBom completed",
    );
  });

  return ok({ bomId: data.id });
}
