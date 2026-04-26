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
import { reassignRequisitionSchema } from "@/features/inventory/schemas/reassign-requisition";

const limiter = createRateLimiter({
  tokens: MANAGER_REQUISITION_CRUD_RATE_TOKENS,
  window: MANAGER_REQUISITION_CRUD_RATE_WINDOW,
  prefix: "inventory-manager-reassign-requisition",
});

/**
 * Reassign a `material_requisitions` row's `assigned_to`.
 * Spec: frontend_spec.md:2091. Action gate `inventory_ops:u` (mirrors
 * RLS UPDATE policy). Only allowed when current status is `pending` or
 * `in_progress` — terminal states keep their assignment record for audit.
 *
 * `newAssigneeId === null` clears the assignee (unassigns).
 */
export async function reassignRequisition(
  input: unknown,
): Promise<ServerActionResult<{ requisitionId: string }>> {
  // 1. Zod parse
  const parsed = reassignRequisitionSchema.safeParse(input);
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

  // 4. UPDATE — same open-states guard as cancel.
  const { data: updated, error } = await supabase
    .from("material_requisitions")
    .update({
      assigned_to: parsed.data.newAssigneeId,
      updated_by: user.id,
    })
    .eq("id", parsed.data.requisitionId)
    .in("status", ["pending", "in_progress"])
    .select("id, assigned_to")
    .maybeSingle();

  if (error) {
    if (error.code === "23503") {
      // FK violation — newAssigneeId doesn't reference an auth user.
      return fail("VALIDATION_FAILED", {
        newAssigneeId: "Selected user is no longer available",
      });
    }
    const log = loggerWith({
      feature: "inventory",
      event: "manager_reassign_requisition",
      user_id: user.id,
    });
    log.error(
      { code: error.code, message: error.message },
      "reassign UPDATE failed",
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
      event: "manager_reassign_requisition",
      user_id: user.id,
    });
    log.info(
      {
        requisition_id: parsed.data.requisitionId,
        new_assignee_id: parsed.data.newAssigneeId,
      },
      "reassignRequisition completed",
    );
  });

  return ok({ requisitionId: parsed.data.requisitionId });
}
