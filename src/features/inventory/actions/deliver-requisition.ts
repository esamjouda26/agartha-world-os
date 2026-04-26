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
  if (!appMeta.domains?.["inventory_ops"]?.includes("u"))
    return fail("FORBIDDEN");

  // Step 3: Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Step 4: Verify the requisition exists, is in_progress, and belongs to user
  const { data: requisition, error: reqFetchError } = await supabase
    .from("material_requisitions")
    .select("id")
    .eq("id", parsed.data.requisition_id)
    .eq("status", "in_progress")
    .eq("assigned_to", user.id)
    .maybeSingle();
  if (reqFetchError) return fail("INTERNAL");
  if (!requisition) return fail("NOT_FOUND");

  // Step 5: Update delivered_qty on each item
  for (const item of parsed.data.items) {
    const { error: itemError } = await supabase
      .from("material_requisition_items")
      .update({ delivered_qty: item.delivered_qty })
      .eq("id", item.item_id)
      .eq("requisition_id", parsed.data.requisition_id);
    if (itemError) return fail("INTERNAL");
  }

  // Step 6: Mark requisition completed
  const { error: completeError } = await supabase
    .from("material_requisitions")
    .update({ status: "completed" })
    .eq("id", parsed.data.requisition_id)
    .eq("assigned_to", user.id);
  if (completeError) return fail("INTERNAL");

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
    log.info(
      { requisitionId: parsed.data.requisition_id },
      "deliverRequisitionAction completed",
    );
  });

  return ok({ requisitionId: parsed.data.requisition_id });
}
