"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { posBomDetailPath } from "@/features/pos/cache-tags";
import { upsertBomComponentSchema } from "@/features/pos/schemas/bom";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "pos-bom-component" });

/**
 * Create or update a bom_component.
 * Schema: init_schema.sql:2248 — bom_components
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:2407-2412)
 *
 * Trigger trg_bom_component_self_ref_check prevents circular refs at DB level.
 * UNIQUE (bom_id, component_material_id) DB-enforced.
 */
export async function upsertBomComponent(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = upsertBomComponentSchema.safeParse(input);
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

  const { id, bomId, componentMaterialId, quantity, scrapPct, isPhantom, sortOrder } = parsed.data;
  let resultId: string;

  if (isUpdate && id) {
    const { data, error } = await supabase
      .from("bom_components")
      .update({
        component_material_id: componentMaterialId,
        quantity,
        scrap_pct: scrapPct,
        is_phantom: isPhantom,
        sort_order: sortOrder,
        updated_by: user.id,
      })
      .eq("id", id)
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-bom-component", user_id: user.id }).error(
        { error: error?.message, code: error?.code },
        "failed to update bom_component",
      );
      if (error?.code === "23505") return fail("CONFLICT");
      return fail("INTERNAL");
    }
    resultId = data.id;
  } else {
    const { data, error } = await supabase
      .from("bom_components")
      .insert({
        bom_id: bomId,
        component_material_id: componentMaterialId,
        quantity,
        scrap_pct: scrapPct,
        is_phantom: isPhantom,
        sort_order: sortOrder,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      loggerWith({ feature: "pos", event: "upsert-bom-component", user_id: user.id }).error(
        { error: error?.message, code: error?.code },
        "failed to insert bom_component",
      );
      if (error?.code === "23505") return fail("CONFLICT");
      return fail("INTERNAL");
    }
    resultId = data.id;
  }

  revalidatePath(posBomDetailPath(bomId), "page");

  after(async () => {
    loggerWith({ feature: "pos", event: "upsert-bom-component", user_id: user.id }).info(
      { id: resultId, bom_id: bomId },
      "upsertBomComponent completed",
    );
  });

  return ok({ id: resultId });
}
