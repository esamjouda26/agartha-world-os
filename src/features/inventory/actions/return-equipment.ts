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
  EQUIPMENT_CUSTODY_RATE_TOKENS,
  EQUIPMENT_CUSTODY_RATE_WINDOW,
} from "@/features/inventory/constants";
import { returnEquipmentSchema } from "@/features/inventory/schemas/return-equipment";

const limiter = createRateLimiter({
  tokens: EQUIPMENT_CUSTODY_RATE_TOKENS,
  window: EQUIPMENT_CUSTODY_RATE_WINDOW,
  prefix: "inventory-return-equipment",
});

/**
 * Mark a returnable asset as returned (WF-20 return). Action gate
 * `inventory_ops:u` mirrors RLS UPDATE policy (init_schema.sql:2959).
 *
 * `WHERE returned_at IS NULL` is the open-state guard — concurrent
 * returns or already-returned rows surface as CONFLICT instead of
 * silently overwriting the prior return record.
 */
export async function returnEquipment(
  input: unknown,
): Promise<ServerActionResult<{ assignmentId: string }>> {
  // 1. Zod parse
  const parsed = returnEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.inventory_ops?.includes("u")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. UPDATE — open-state guard via `returned_at IS NULL`.
  const { data: updated, error } = await supabase
    .from("equipment_assignments")
    .update({
      returned_at: new Date().toISOString(),
      condition_on_return: parsed.data.conditionOnReturn,
      notes: parsed.data.notes,
      updated_by: user.id,
    })
    .eq("id", parsed.data.assignmentId)
    .is("returned_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const log = loggerWith({
      feature: "inventory",
      event: "return_equipment",
      user_id: user.id,
    });
    log.error(
      { code: error.code, message: error.message },
      "return UPDATE failed",
    );
    return fail("INTERNAL");
  }
  if (!updated) {
    return fail("CONFLICT", {
      form: "This assignment has already been returned.",
    });
  }

  // 5. Invalidate cache (ADR-0006)
  for (const p of INVENTORY_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "return_equipment",
      user_id: user.id,
    });
    log.info(
      { assignment_id: parsed.data.assignmentId },
      "returnEquipment completed",
    );
  });

  return ok({ assignmentId: parsed.data.assignmentId });
}
