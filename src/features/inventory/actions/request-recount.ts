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
  RECONCILIATION_REVIEW_RATE_TOKENS,
  RECONCILIATION_REVIEW_RATE_WINDOW,
} from "@/features/inventory/constants";
import { requestRecountSchema } from "@/features/inventory/schemas/request-recount";

const limiter = createRateLimiter({
  tokens: RECONCILIATION_REVIEW_RATE_TOKENS,
  window: RECONCILIATION_REVIEW_RATE_WINDOW,
  prefix: "inventory-request-recount",
});

/**
 * Request a recount on a reconciliation in `pending_review` (WF-11
 * Option A). Wraps SECURITY DEFINER RPC `rpc_request_recount(uuid, uuid)`
 * at init_schema.sql:6128-6142, which atomically:
 *   • re-checks `inventory_ops:u`
 *   • flips status from pending_review → in_progress
 *   • optionally swaps assigned_to (when p_new_runner_id is non-null)
 *   • DELETEs all inventory_reconciliation_items
 *
 * Mapping RPC errors:
 *   "Forbidden: inventory_ops:u required"  → FORBIDDEN
 *   "RECON_NOT_PENDING_REVIEW"             → CONFLICT
 *   anything else                          → INTERNAL
 */
export async function requestRecount(
  input: unknown,
): Promise<ServerActionResult<{ reconciliationId: string }>> {
  // 1. Zod parse
  const parsed = requestRecountSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — RPC re-checks but we short-circuit early
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

  // 4. Invoke RPC. The RPC's `p_new_runner_id` has SQL DEFAULT NULL
  //    (init_schema.sql:6128) so typegen treats it as optional. Omit
  //    the key when the caller passed null — the RPC's COALESCE then
  //    keeps the existing assignee unchanged.
  const { error } = await supabase.rpc("rpc_request_recount", {
    p_reconciliation_id: parsed.data.reconciliationId,
    ...(parsed.data.newAssigneeId !== null
      ? { p_new_runner_id: parsed.data.newAssigneeId }
      : {}),
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("inventory_ops:u required")) return fail("FORBIDDEN");
    if (message.includes("RECON_NOT_PENDING_REVIEW")) {
      return fail("CONFLICT", {
        form: "Reconciliation is no longer awaiting review.",
      });
    }
    const log = loggerWith({
      feature: "inventory",
      event: "request_recount",
      user_id: user.id,
    });
    log.error(
      { code: error.code, message: error.message },
      "rpc_request_recount failed",
    );
    return fail("INTERNAL");
  }

  // 5. Invalidate cache
  for (const p of INVENTORY_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "request_recount",
      user_id: user.id,
    });
    log.info(
      {
        reconciliation_id: parsed.data.reconciliationId,
        new_assignee_id: parsed.data.newAssigneeId,
      },
      "requestRecount completed",
    );
  });

  return ok({ reconciliationId: parsed.data.reconciliationId });
}
