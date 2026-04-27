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
  DELIVER_REQUISITION_RATE_TOKENS,
  DELIVER_REQUISITION_RATE_WINDOW,
} from "@/features/inventory/constants";
import { completeDeliverySchema } from "@/features/inventory/schemas/complete-delivery";

export type DeliverRequisitionResult = Readonly<{
  requisitionId: string;
}>;

const limiter = createRateLimiter({
  tokens: DELIVER_REQUISITION_RATE_TOKENS,
  window: DELIVER_REQUISITION_RATE_WINDOW,
  prefix: "inventory-deliver-requisition",
});

/**
 * Records actual delivered quantities for each requisition line and marks the
 * requisition as 'completed'.
 *
 * RBAC: inventory_ops:u — updating delivery confirms a pre-existing
 * in_progress requisition; the creator used inventory_ops:c.
 *
 * Only requisitions assigned to the calling user and in 'in_progress' status
 * can be completed. The WHERE clause on the requisition update acts as the
 * ownership + state guard.
 */
export async function deliverRequisitionAction(
  input: unknown,
): Promise<ServerActionResult<DeliverRequisitionResult>> {
  // Step 1: Validate input
  const parsed = completeDeliverySchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // Step 2: AuthN + RBAC
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.["inventory_ops"]?.includes("u")) return fail("FORBIDDEN");

  // Step 3: Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Steps 4–6: Atomic close via rpc_complete_delivery — locks the parent
  // row, validates ownership + state, applies delivered_qty per item, and
  // transitions status → 'completed' inside a single transaction
  // (CLAUDE.md §4 transactional boundary).
  const { error: rpcError } = await supabase.rpc("rpc_complete_delivery", {
    p_requisition_id: parsed.data.requisition_id,
    p_items: parsed.data.items.map((i) => ({
      item_id: i.item_id,
      delivered_qty: i.delivered_qty,
    })),
    p_actor_id: user.id,
  });
  if (rpcError) {
    if (rpcError.message.includes("requisition_not_found")) return fail("NOT_FOUND");
    if (rpcError.message.includes("forbidden_not_assignee")) return fail("FORBIDDEN");
    if (rpcError.message.includes("invalid_state")) return fail("CONFLICT");
    if (rpcError.message.includes("item_not_found")) return fail("NOT_FOUND");
    if (rpcError.message.includes("LOCATION_CATEGORY_MISMATCH")) {
      return fail("VALIDATION_FAILED", {
        form: "One or more items belong to a category not allowed at the destination location.",
      });
    }
    const log = loggerWith({
      feature: "inventory",
      event: "deliver_requisition_rpc_error",
      user_id: user.id,
    });
    log.error(
      {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      },
      "rpc_complete_delivery failed with unhandled error",
    );
    return fail("INTERNAL");
  }

  // Step 7: Invalidate router cache
  for (const path of INVENTORY_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "deliver_requisition",
      user_id: user.id,
    });
    log.info({ requisitionId: parsed.data.requisition_id }, "deliverRequisitionAction completed");
  });

  return ok({ requisitionId: parsed.data.requisition_id });
}
