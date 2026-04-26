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
  SUPPLIER_CRUD_RATE_TOKENS,
  SUPPLIER_CRUD_RATE_WINDOW,
} from "@/features/procurement/constants";
import { upsertSupplierAssignmentSchema } from "@/features/procurement/schemas/material";

// ── Rate limiter ────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: SUPPLIER_CRUD_RATE_TOKENS,
  window: SUPPLIER_CRUD_RATE_WINDOW,
  prefix: "procurement-supplier-assignment",
});

// ── Upsert Supplier Assignment ──────────────────────────────────────────

/**
 * Create or update a supplier assignment for a material — 8-step pipeline.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/[id]` Suppliers tab.
 * RBAC: procurement:c OR procurement:u.
 * UPSERT material_procurement_data → revalidatePath (ADR-0006).
 *
 * Zod rule: exactly 1 row must have is_default = TRUE per material.
 * The partial unique index `idx_material_procurement_one_default` enforces
 * this at the DB level. If the caller sets is_default = true, we first
 * clear any existing default for that material (within the same request).
 */
export async function upsertSupplierAssignment(
  input: unknown,
): Promise<ServerActionResult<{ materialId: string; supplierId: string }>> {
  // 1. Zod parse
  const parsed = upsertSupplierAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires procurement:c OR procurement:u
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const procAccess = appMeta.domains?.procurement ?? [];
  if (!procAccess.includes("c") && !procAccess.includes("u")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. If marking as default, clear existing default first
  const d = parsed.data;
  if (d.isDefault) {
    const { error: clearErr } = await supabase
      .from("material_procurement_data")
      .update({ is_default: false })
      .eq("material_id", d.materialId)
      .eq("is_default", true);
    if (clearErr) {
      const log = loggerWith({
        feature: "procurement",
        event: "upsert-supplier-assignment",
        user_id: user.id,
      });
      log.error(
        { error: clearErr.message },
        "failed to clear existing default supplier",
      );
      return fail("INTERNAL");
    }
  }

  // 5. Upsert the supplier assignment
  const { error } = await supabase.from("material_procurement_data").upsert(
    {
      material_id: d.materialId,
      supplier_id: d.supplierId,
      supplier_sku: d.supplierSku || null,
      cost_price: d.costPrice,
      purchase_unit_id: d.purchaseUnitId,
      lead_time_days: d.leadTimeDays,
      min_order_qty: d.minOrderQty,
      is_default: d.isDefault,
    },
    { onConflict: "material_id,supplier_id" },
  );

  if (error) {
    const log = loggerWith({
      feature: "procurement",
      event: "upsert-supplier-assignment",
      user_id: user.id,
    });
    log.error(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
      "failed to upsert supplier assignment",
    );
    return fail("INTERNAL");
  }

  // 6. Invalidate cache
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "upsert-supplier-assignment",
      user_id: user.id,
    });
    log.info(
      { material_id: d.materialId, supplier_id: d.supplierId },
      "upsertSupplierAssignment completed",
    );
  });

  return ok({ materialId: d.materialId, supplierId: d.supplierId });
}
