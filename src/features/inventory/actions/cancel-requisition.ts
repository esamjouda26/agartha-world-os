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
  MANAGER_REQUISITION_CRUD_RATE_TOKENS,
  MANAGER_REQUISITION_CRUD_RATE_WINDOW,
} from "@/features/inventory/constants";
import { cancelRequisitionSchema } from "@/features/inventory/schemas/cancel-requisition";

const limiter = createRateLimiter({
  tokens: MANAGER_REQUISITION_CRUD_RATE_TOKENS,
  window: MANAGER_REQUISITION_CRUD_RATE_WINDOW,
  prefix: "inventory-manager-cancel-requisition",
});

/**
 * Cancel a `material_requisitions` row by flipping status to 'cancelled'.
 * Spec: frontend_spec.md:2090. Action gate `inventory_ops:u` (mirrors
 * RLS UPDATE policy). Only allowed when current status is `pending` or
 * `in_progress` — `completed` and `cancelled` are terminal.
 */
export async function cancelRequisition(
  input: unknown,
): Promise<ServerActionResult<{ requisitionId: string }>> {
  // 1. Zod parse
  const parsed = cancelRequisitionSchema.safeParse(input);
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

  // 4. UPDATE — `.in("status", ...)` enforces the open-states guard at
  //    the SQL level so we don't race with a concurrent transition. A
  //    null result from `.maybeSingle()` means the row exists but moved
  //    on, or doesn't exist / RLS-filtered.
  const { data: updated, error } = await supabase
    .from("material_requisitions")
    .update({ status: "cancelled", updated_by: user.id })
    .eq("id", parsed.data.requisitionId)
    .in("status", ["pending", "in_progress"])
    .select("id, status")
    .maybeSingle();

  if (error) {
    const log = loggerWith({
      feature: "inventory",
      event: "manager_cancel_requisition",
      user_id: user.id,
    });
    log.error(
      { code: error.code, message: error.message },
      "cancel UPDATE failed",
    );
    return fail("INTERNAL");
  }
  if (!updated) {
    return fail("CONFLICT", {
      form: "Requisition is no longer pending or in-progress.",
    });
  }

  // 5. Invalidate cache (ADR-0006)
  for (const p of INVENTORY_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "manager_cancel_requisition",
      user_id: user.id,
    });
    log.info(
      { requisition_id: parsed.data.requisitionId },
      "cancelRequisition completed",
    );
  });

  return ok({ requisitionId: parsed.data.requisitionId });
}
