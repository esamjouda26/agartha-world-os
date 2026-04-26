"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POS_ROUTER_PATHS } from "@/features/pos/cache-tags";
import { cloneBomSchema } from "@/features/pos/schemas/bom";

const limiter = createRateLimiter({ tokens: 20, window: "60 s", prefix: "pos-bom-clone" });

/**
 * Clone an existing BOM as a new draft version (copies bom_components).
 * Schema: init_schema.sql:2225 — bill_of_materials
 * RLS: INSERT pos:c (init_schema.sql:2398-2399)
 *
 * App-level transaction: insert new BOM → copy components. On any failure,
 * we roll back manually by deleting the new BOM head.
 */
export async function cloneBom(
  input: unknown,
): Promise<ServerActionResult<{ bomId: string }>> {
  const parsed = cloneBomSchema.safeParse(input);
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

  const { sourceBomId, version } = parsed.data;

  // 1. Read source BOM
  const { data: source, error: srcErr } = await supabase
    .from("bill_of_materials")
    .select("parent_material_id, effective_from, yield_qty")
    .eq("id", sourceBomId)
    .maybeSingle();
  if (srcErr) {
    loggerWith({ feature: "pos", event: "clone-bom", user_id: user.id }).error(
      { error: srcErr.message },
      "failed to read source BOM",
    );
    return fail("INTERNAL");
  }
  if (!source) return fail("NOT_FOUND");

  // 2. Insert new BOM head as draft
  const { data: newBom, error: insErr } = await supabase
    .from("bill_of_materials")
    .insert({
      parent_material_id: source.parent_material_id,
      version,
      effective_from: source.effective_from,
      status: "draft",
      is_default: false,
      yield_qty: source.yield_qty,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insErr || !newBom) {
    loggerWith({ feature: "pos", event: "clone-bom", user_id: user.id }).error(
      { error: insErr?.message, code: insErr?.code },
      "failed to insert cloned BOM head",
    );
    if (insErr?.code === "23505") return fail("CONFLICT");
    return fail("INTERNAL");
  }

  // 3. Copy components
  const { data: srcComponents, error: compReadErr } = await supabase
    .from("bom_components")
    .select("component_material_id, quantity, scrap_pct, is_phantom, sort_order")
    .eq("bom_id", sourceBomId);

  if (compReadErr) {
    await supabase.from("bill_of_materials").delete().eq("id", newBom.id);
    return fail("INTERNAL");
  }

  if ((srcComponents ?? []).length > 0) {
    const inserts = (srcComponents ?? []).map((c) => ({
      bom_id: newBom.id,
      component_material_id: c.component_material_id,
      quantity: c.quantity,
      scrap_pct: c.scrap_pct ?? 0,
      is_phantom: c.is_phantom ?? false,
      sort_order: c.sort_order ?? 0,
      created_by: user.id,
    }));
    const { error: compInsErr } = await supabase.from("bom_components").insert(inserts);
    if (compInsErr) {
      await supabase.from("bill_of_materials").delete().eq("id", newBom.id);
      loggerWith({ feature: "pos", event: "clone-bom", user_id: user.id }).error(
        { error: compInsErr.message },
        "failed to copy components — rolled back",
      );
      return fail("INTERNAL");
    }
  }

  for (const path of POS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "pos", event: "clone-bom", user_id: user.id }).info(
      { source_bom_id: sourceBomId, new_bom_id: newBom.id, version },
      "cloneBom completed",
    );
  });

  return ok({ bomId: newBom.id });
}
