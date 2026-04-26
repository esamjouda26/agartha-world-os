"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INVENTORY_ROUTER_PATHS } from "@/features/inventory/cache-tags";
import {
  MOVEMENT_TYPE_CRUD_RATE_TOKENS,
  MOVEMENT_TYPE_CRUD_RATE_WINDOW,
} from "@/features/inventory/constants";
import { upsertMovementTypeSchema } from "@/features/inventory/schemas/upsert-movement-type";

const limiter = createRateLimiter({
  tokens: MOVEMENT_TYPE_CRUD_RATE_TOKENS,
  window: MOVEMENT_TYPE_CRUD_RATE_WINDOW,
  prefix: "inventory-upsert-movement-type",
});

/**
 * Create / update a `movement_types` row. Spec: frontend_spec.md:2282.
 *
 * Action gates `inventory:c` for create, `inventory:u` for update —
 * mirrors RLS at init_schema.sql:2645-2650. Note this is the
 * `inventory` domain (master/config), NOT `inventory_ops` — separate
 * domain ownership.
 */
export async function upsertMovementType(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  // 1. Zod parse
  const parsed = upsertMovementTypeSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — distinct gate per intent (create vs update).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const inventoryC = appMeta.domains?.inventory?.includes("c") ?? false;
  const inventoryU = appMeta.domains?.inventory?.includes("u") ?? false;
  const isUpdate = parsed.data.id !== null;
  if (isUpdate ? !inventoryU : !inventoryC) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  let resultId: string;

  if (isUpdate && d.id) {
    // 4a. UPDATE — `code` is technically mutable, but changing it
    //     breaks any ledger reference that resolves the movement_type
    //     by code. We allow it but document the caveat in JSDoc; the
    //     UI can additionally lock the field on edit if desired.
    const { data: updated, error } = await supabase
      .from("movement_types")
      .update({
        code: d.code,
        name: d.name,
        description: d.description,
        direction: d.direction,
        requires_source_doc: d.requiresSourceDoc,
        requires_cost_center: d.requiresCostCenter,
        is_active: d.isActive,
      })
      .eq("id", d.id)
      .select("id")
      .maybeSingle();
    if (error) {
      if (error.code === "23505") {
        return fail("VALIDATION_FAILED", {
          code: "Code already exists.",
        });
      }
      const log = loggerWith({
        feature: "inventory",
        event: "upsert_movement_type",
        user_id: user.id,
      });
      log.error(
        { code: error.code, message: error.message },
        "movement_type UPDATE failed",
      );
      return fail("INTERNAL");
    }
    if (!updated) return fail("NOT_FOUND");
    resultId = updated.id;
  } else {
    // 4b. INSERT
    const { data: inserted, error } = await supabase
      .from("movement_types")
      .insert({
        code: d.code,
        name: d.name,
        description: d.description,
        direction: d.direction,
        requires_source_doc: d.requiresSourceDoc,
        requires_cost_center: d.requiresCostCenter,
        is_active: d.isActive,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      if (error?.code === "23505") {
        return fail("VALIDATION_FAILED", {
          code: "Code already exists.",
        });
      }
      const log = loggerWith({
        feature: "inventory",
        event: "upsert_movement_type",
        user_id: user.id,
      });
      log.error(
        { code: error?.code, message: error?.message },
        "movement_type INSERT failed",
      );
      return fail("INTERNAL");
    }
    resultId = inserted.id;
  }

  // 5. Invalidate cache (ADR-0006)
  for (const p of INVENTORY_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "upsert_movement_type",
      user_id: user.id,
    });
    log.info(
      { id: resultId, code: d.code, is_update: isUpdate },
      "upsertMovementType completed",
    );
  });

  return ok({ id: resultId });
}
