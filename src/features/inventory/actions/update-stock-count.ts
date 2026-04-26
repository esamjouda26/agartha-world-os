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
  UPDATE_STOCK_COUNT_RATE_TOKENS,
  UPDATE_STOCK_COUNT_RATE_WINDOW,
} from "@/features/inventory/constants";
import { updateStockCountSchema } from "@/features/inventory/schemas/update-stock-count";

export type UpdateStockCountResult = Readonly<{
  reconciliationId: string;
  discrepancyFound: boolean;
  newStatus: "pending_review" | "completed";
}>;

const limiter = createRateLimiter({
  tokens: UPDATE_STOCK_COUNT_RATE_TOKENS,
  window: UPDATE_STOCK_COUNT_RATE_WINDOW,
  prefix: "inventory-update-stock-count",
});

/**
 * Records physical quantities for each reconciliation line item and
 * transitions the parent reconciliation to a terminal or review state.
 *
 * Post-submission state machine:
 *   - If any physical_qty differs from system_qty → 'pending_review',
 *     discrepancy_found = TRUE
 *   - If all physical_qty match system_qty exactly → 'completed',
 *     discrepancy_found = FALSE
 *
 * Blind-count integrity: system_qty is fetched server-side only here —
 * it is never returned to any query that feeds the client form.
 *
 * RBAC: inventory_ops:u (updating an existing task record).
 */
export async function updateStockCountAction(
  input: unknown,
): Promise<ServerActionResult<UpdateStockCountResult>> {
  // Step 1: Validate input
  const parsed = updateStockCountSchema.safeParse(input);
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

  // Step 4: Verify reconciliation belongs to user and is active
  const { data: reconciliation, error: recFetchError } = await supabase
    .from("inventory_reconciliations")
    .select("id")
    .eq("id", parsed.data.reconciliation_id)
    .eq("assigned_to", user.id)
    .in("status", ["pending", "in_progress"])
    .maybeSingle();
  if (recFetchError) return fail("INTERNAL");
  if (!reconciliation) return fail("NOT_FOUND");

  // Step 5: Fetch all items (including system_qty for comparison — server only)
  const { data: allItems, error: itemsFetchError } = await supabase
    .from("inventory_reconciliation_items")
    .select("id, system_qty, physical_qty")
    .eq("reconciliation_id", parsed.data.reconciliation_id);
  if (itemsFetchError) return fail("INTERNAL");

  // Build a lookup of submitted physical quantities
  const submittedMap = new Map<string, number>();
  for (const item of parsed.data.items) {
    submittedMap.set(item.item_id, item.physical_qty);
  }

  // Step 6: Update physical_qty for submitted items
  for (const item of parsed.data.items) {
    const { error: updateError } = await supabase
      .from("inventory_reconciliation_items")
      .update({ physical_qty: item.physical_qty })
      .eq("id", item.item_id)
      .eq("reconciliation_id", parsed.data.reconciliation_id);
    if (updateError) return fail("INTERNAL");
  }

  // Step 7: Determine final state by comparing all physical to system quantities
  // Use the submitted values for items we just updated; existing values for others.
  let discrepancyFound = false;
  for (const item of allItems ?? []) {
    const effectivePhysical = submittedMap.has(item.id)
      ? (submittedMap.get(item.id) as number)
      : item.physical_qty;
    if (effectivePhysical !== item.system_qty) {
      discrepancyFound = true;
      break;
    }
  }

  const newStatus = discrepancyFound ? "pending_review" : "completed";

  const { error: statusError } = await supabase
    .from("inventory_reconciliations")
    .update({ status: newStatus, discrepancy_found: discrepancyFound })
    .eq("id", parsed.data.reconciliation_id);
  if (statusError) return fail("INTERNAL");

  // Step 8: Invalidate router cache
  for (const path of INVENTORY_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "update_stock_count",
      user_id: user.id,
    });
    log.info(
      {
        reconciliationId: parsed.data.reconciliation_id,
        discrepancyFound,
        newStatus,
      },
      "updateStockCountAction completed",
    );
  });

  return ok({
    reconciliationId: parsed.data.reconciliation_id,
    discrepancyFound,
    newStatus,
  });
}
