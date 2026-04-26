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
  CATEGORY_CRUD_RATE_TOKENS,
  CATEGORY_CRUD_RATE_WINDOW,
} from "@/features/procurement/constants";
import { updateMaterialCategorySchema } from "@/features/procurement/schemas/material-category";

const limiter = createRateLimiter({
  tokens: CATEGORY_CRUD_RATE_TOKENS,
  window: CATEGORY_CRUD_RATE_WINDOW,
  prefix: "procurement-category-update",
});

/**
 * Update a `material_categories` row. Re-parenting and re-coding are
 * disallowed — see schemas/material-category.ts (ltree path recomputation
 * is out of scope for v1).
 *
 * RLS allows UPDATE for `procurement:u` OR `pos:u`
 * (init_schema.sql:1259-1265).
 */
export async function updateMaterialCategory(
  input: unknown,
): Promise<ServerActionResult<{ categoryId: string }>> {
  // 1. Zod parse
  const parsed = updateMaterialCategorySchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC (procurement:u OR pos:u)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const procU = appMeta.domains?.procurement?.includes("u") ?? false;
  const posU = appMeta.domains?.pos?.includes("u") ?? false;
  if (!procU && !posU) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;

  // 4. UPDATE — non-tree-shape fields only. `.select(...).maybeSingle()`
  //    returns null when no row matched (RLS filtered or wrong id), which
  //    we surface as NOT_FOUND.
  const { data: updated, error } = await supabase
    .from("material_categories")
    .update({
      name: d.name,
      is_bom_eligible: d.isBomEligible,
      is_consumable: d.isConsumable,
      default_valuation: d.defaultValuation,
      accounting_category: d.accountingCategory,
      sort_order: d.sortOrder,
      is_active: d.isActive,
      updated_by: user.id,
    })
    .eq("id", d.categoryId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return fail("VALIDATION_FAILED", {
        name: "Name already exists at this level",
      });
    }
    const log = loggerWith({
      feature: "procurement",
      event: "update_material_category",
      user_id: user.id,
    });
    log.error(
      { code: error.code, message: error.message },
      "updateMaterialCategory failed",
    );
    return fail("INTERNAL");
  }
  if (!updated) return fail("NOT_FOUND");

  // 5. Invalidate cache
  for (const p of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "update_material_category",
      user_id: user.id,
    });
    log.info({ category_id: d.categoryId }, "updateMaterialCategory completed");
  });

  return ok({ categoryId: d.categoryId });
}
