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
import { createMaterialCategorySchema } from "@/features/procurement/schemas/material-category";

const limiter = createRateLimiter({
  tokens: CATEGORY_CRUD_RATE_TOKENS,
  window: CATEGORY_CRUD_RATE_WINDOW,
  prefix: "procurement-category-create",
});

/**
 * Create a `material_categories` row.
 *
 * `path` (ltree) and `depth` are NOT auto-derived by a trigger
 * (init_schema.sql:1049-1067) — we compute them in JS:
 *   • root  → path = code,           depth = 0
 *   • child → path = parent.path||code, depth = parent.depth + 1
 * Convention follows seed data (supabase/seed.sql:62-75) which uses the
 * unique `code` column as the ltree label.
 *
 * RLS allows INSERT for `procurement:c` OR `pos:c`
 * (init_schema.sql:1255-1258); the action mirrors that gate.
 */
export async function createMaterialCategory(
  input: unknown,
): Promise<ServerActionResult<{ categoryId: string }>> {
  // 1. Zod parse
  const parsed = createMaterialCategorySchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC (procurement:c OR pos:c, mirrors RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const procC = appMeta.domains?.procurement?.includes("c") ?? false;
  const posC = appMeta.domains?.pos?.includes("c") ?? false;
  if (!procC && !posC) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;

  // 4. Resolve parent (when supplied) to compute path + depth
  let path: string;
  let depth: number;
  if (d.parentId === null) {
    path = d.code;
    depth = 0;
  } else {
    const { data: parent, error: parentErr } = await supabase
      .from("material_categories")
      .select("path, depth")
      .eq("id", d.parentId)
      .maybeSingle();
    if (parentErr) return fail("INTERNAL");
    if (!parent) {
      return fail("VALIDATION_FAILED", { parentId: "Parent category not found" });
    }
    path = `${String(parent.path)}.${d.code}`;
    depth = (parent.depth ?? 0) + 1;
  }

  // 5. Execute INSERT
  const { data: record, error } = await supabase
    .from("material_categories")
    .insert({
      parent_id: d.parentId,
      code: d.code,
      name: d.name,
      depth,
      path,
      is_bom_eligible: d.isBomEligible,
      is_consumable: d.isConsumable,
      default_valuation: d.defaultValuation,
      accounting_category: d.accountingCategory,
      sort_order: d.sortOrder,
      is_active: d.isActive,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !record) {
    if (error?.code === "23505") {
      return fail("VALIDATION_FAILED", {
        code: "Code or name already exists at this level",
      });
    }
    const log = loggerWith({
      feature: "procurement",
      event: "create_material_category",
      user_id: user.id,
    });
    log.error(
      { code: error?.code, message: error?.message },
      "createMaterialCategory failed",
    );
    return fail("INTERNAL");
  }

  // 6. Invalidate cache (ADR-0006)
  for (const p of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "create_material_category",
      user_id: user.id,
    });
    log.info({ category_id: record.id }, "createMaterialCategory completed");
  });

  return ok({ categoryId: record.id });
}
