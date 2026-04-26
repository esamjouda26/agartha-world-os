"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROCUREMENT_ROUTER_PATHS } from "@/features/procurement/cache-tags";
import {
  RECEIVE_PO_ITEMS_RATE_TOKENS,
  RECEIVE_PO_ITEMS_RATE_WINDOW,
} from "@/features/procurement/constants";
import { receivePoSchema } from "@/features/procurement/schemas/receive-po";

export type ReceivePoItemsResult = Readonly<{
  poId: string;
}>;

const limiter = createRateLimiter({
  tokens: RECEIVE_PO_ITEMS_RATE_TOKENS,
  window: RECEIVE_PO_ITEMS_RATE_WINDOW,
  prefix: "procurement-receive-po-items",
});

/**
 * Records received quantities for purchase order line items.
 *
 * The DB trigger `trg_po_receive_goods_movement` fires after each
 * purchase_order_items UPDATE and posts a goods movement of type 'goods_receipt'
 * for the delta quantity (new_received_qty - old_received_qty). This action
 * must not replicate that trigger logic.
 *
 * PO status is NOT updated here — the trigger or a dedicated RPC handles the
 * 'sent' → 'partially_received' → 'completed' transition based on whether all
 * expected_qty has been received. This avoids a TOCTOU race on concurrent
 * receiving sessions.
 *
 * RBAC: procurement:u — updating pre-existing PO line items.
 */
export async function receivePoItemsAction(
  input: unknown,
): Promise<ServerActionResult<ReceivePoItemsResult>> {
  // Step 1: Validate input
  const parsed = receivePoSchema.safeParse(input);
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
  if (!appMeta.domains?.["procurement"]?.includes("u")) return fail("FORBIDDEN");

  // Step 3: Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Steps 4–5: Atomic receive via rpc_receive_po_items — locks the parent
  // PO row, validates state, applies received_qty deltas inside a single
  // transaction (CLAUDE.md §4 transactional boundary). The
  // trg_po_receive_goods_movement trigger posts goods_movement entries
  // per delta as before.
  const { error: rpcError } = await supabase.rpc("rpc_receive_po_items", {
    p_po_id: parsed.data.po_id,
    p_items: parsed.data.items.map((i) => ({
      item_id: i.item_id,
      received_qty: i.received_qty,
    })),
    p_actor_id: user.id,
  });
  if (rpcError) {
    if (rpcError.message.includes("po_not_found")) return fail("NOT_FOUND");
    if (rpcError.message.includes("invalid_state")) return fail("CONFLICT");
    if (rpcError.message.includes("item_not_found")) return fail("NOT_FOUND");
    return fail("INTERNAL");
  }

  // Step 6: Invalidate router cache
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "receive_po_items",
      user_id: user.id,
    });
    log.info(
      { poId: parsed.data.po_id, itemCount: parsed.data.items.length },
      "receivePoItemsAction completed",
    );
  });

  return ok({ poId: parsed.data.po_id });
}
