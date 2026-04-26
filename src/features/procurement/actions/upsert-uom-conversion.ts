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
import { upsertUomConversionSchema } from "@/features/procurement/schemas/material";

// ── Rate limiter ────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: MATERIAL_CRUD_RATE_TOKENS,
  window: MATERIAL_CRUD_RATE_WINDOW,
  prefix: "procurement-uom-conversion",
});

// ── Upsert UOM Conversion ───────────────────────────────────────────────

/**
 * Create or update a UOM conversion — 8-step enterprise pipeline.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/[id]` UOM tab.
 * RBAC: system:c OR procurement:c.
 * UPSERT uom_conversions → revalidatePath (ADR-0006).
 */
export async function upsertUomConversion(
  input: unknown,
): Promise<ServerActionResult<{ conversionId: string }>> {
  // 1. Zod parse
  const parsed = upsertUomConversionSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires system:c OR procurement:c
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const sysAccess = appMeta.domains?.system ?? [];
  const procAccess = appMeta.domains?.procurement ?? [];
  if (!sysAccess.includes("c") && !procAccess.includes("c")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Execute mutation — INSERT or UPDATE based on id presence
  const d = parsed.data;
  let conversionId: string;

  if (d.id) {
    // Update existing
    const { error } = await supabase
      .from("uom_conversions")
      .update({
        from_unit_id: d.fromUnitId,
        to_unit_id: d.toUnitId,
        factor: d.factor,
      })
      .eq("id", d.id);

    if (error) {
      const log = loggerWith({
        feature: "procurement",
        event: "upsert-uom-conversion",
        user_id: user.id,
      });
      log.error(
        { error: error.message, code: error.code },
        "failed to update uom conversion",
      );
      return fail("INTERNAL");
    }
    conversionId = d.id;
  } else {
    // Insert new
    const { data: record, error } = await supabase
      .from("uom_conversions")
      .insert({
        material_id: d.materialId ?? null,
        from_unit_id: d.fromUnitId,
        to_unit_id: d.toUnitId,
        factor: d.factor,
      })
      .select("id")
      .single();

    if (error || !record) {
      const log = loggerWith({
        feature: "procurement",
        event: "upsert-uom-conversion",
        user_id: user.id,
      });
      log.error(
        { error: error?.message, code: error?.code },
        "failed to insert uom conversion",
      );
      return fail("INTERNAL");
    }
    conversionId = record.id;
  }

  // 5. Invalidate cache
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "upsert-uom-conversion",
      user_id: user.id,
    });
    log.info(
      { conversion_id: conversionId, material_id: d.materialId },
      "upsertUomConversion completed",
    );
  });

  return ok({ conversionId });
}
