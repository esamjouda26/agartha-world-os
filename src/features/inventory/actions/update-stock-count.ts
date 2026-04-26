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
  if (!appMeta.domains?.["inventory_ops"]?.includes("u")) return fail("FORBIDDEN");

  // Step 3: Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Steps 4–7: Atomic close via rpc_complete_stock_count — applies
  // physical_qty per item, recomputes discrepancy across the FULL set
  // (effective = submitted ?? existing), and transitions status inside a
  // single transaction (CLAUDE.md §4 transactional boundary).
  const { data: rpcResult, error: rpcError } = await supabase.rpc("rpc_complete_stock_count", {
    p_reconciliation_id: parsed.data.reconciliation_id,
    p_items: parsed.data.items.map((i) => ({
      item_id: i.item_id,
      physical_qty: i.physical_qty,
    })),
    p_actor_id: user.id,
  });
  if (rpcError) {
    if (rpcError.message.includes("reconciliation_not_found")) return fail("NOT_FOUND");
    if (rpcError.message.includes("forbidden_not_assignee")) return fail("FORBIDDEN");
    if (rpcError.message.includes("invalid_state")) return fail("CONFLICT");
    if (rpcError.message.includes("item_not_found")) return fail("NOT_FOUND");
    return fail("INTERNAL");
  }

  const result = rpcResult as unknown as {
    discrepancy_found: boolean;
    new_status: "pending_review" | "completed";
  };
  const discrepancyFound = result.discrepancy_found;
  const newStatus = result.new_status;

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
