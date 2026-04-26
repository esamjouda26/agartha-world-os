"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROCUREMENT_ROUTER_PATHS } from "@/features/procurement/cache-tags";
import {
  MATERIAL_CRUD_RATE_TOKENS,
  MATERIAL_CRUD_RATE_WINDOW,
} from "@/features/procurement/constants";
import { updateMaterialSchema } from "@/features/procurement/schemas/material";

// ── Rate limiter ────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: MATERIAL_CRUD_RATE_TOKENS,
  window: MATERIAL_CRUD_RATE_WINDOW,
  prefix: "procurement-update-material",
});

// ── Update Material ─────────────────────────────────────────────────────

/**
 * Update an existing material — 8-step enterprise pipeline.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/[id]` Info tab.
 * RBAC: procurement:u OR pos:u.
 * UPDATE materials WHERE id → revalidatePath (ADR-0006).
 */
export async function updateMaterial(
  input: unknown,
): Promise<ServerActionResult<{ materialId: string }>> {
  // 1. Zod parse
  const parsed = updateMaterialSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires procurement:u OR pos:u
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const procAccess = appMeta.domains?.procurement ?? [];
  const posAccess = appMeta.domains?.pos ?? [];
  if (!procAccess.includes("u") && !posAccess.includes("u")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Execute mutation
  const d = parsed.data;
  const { error } = await supabase
    .from("materials")
    .update({
      name: d.name,
      sku: d.sku || null,
      barcode: d.barcode || null,
      material_type: d.materialType,
      category_id: d.categoryId,
      base_unit_id: d.baseUnitId,
      reorder_point: d.reorderPoint,
      safety_stock: d.safetyStock,
      standard_cost: d.standardCost ?? null,
      valuation_method: d.valuationMethod,
      shelf_life_days: d.shelfLifeDays ?? null,
      storage_conditions: d.storageConditions || null,
      weight_kg: d.weightKg ?? null,
      is_returnable: d.isReturnable,
      is_active: d.isActive,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.id);

  if (error) {
    const log = loggerWith({
      feature: "procurement",
      event: "update-material",
      user_id: user.id,
    });
    log.error(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
      "failed to update material",
    );
    return fail("INTERNAL");
  }

  // 5. Invalidate cache — surgical per ADR-0006
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "update-material",
      user_id: user.id,
    });
    log.info({ material_id: d.id }, "updateMaterial completed");
  });

  return ok({ materialId: d.id });
}
