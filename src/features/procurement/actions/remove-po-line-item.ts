"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROCUREMENT_ROUTER_PATHS } from "@/features/procurement/cache-tags";
import {
  PO_CRUD_RATE_TOKENS,
  PO_CRUD_RATE_WINDOW,
} from "@/features/procurement/constants";
import { removePoLineItemSchema } from "@/features/procurement/schemas/purchase-order";

const limiter = createRateLimiter({
  tokens: PO_CRUD_RATE_TOKENS,
  window: PO_CRUD_RATE_WINDOW,
  prefix: "procurement-remove-po-item",
});

/**
 * Remove a line item from a draft PO — 8-step enterprise pipeline.
 *
 * Spec: "Remove line item (draft only): delete button per row → confirmation
 *        → Server Action → DELETE purchase_order_items → revalidatePath"
 * RBAC: procurement:u.
 */
export async function removePoLineItem(
  input: unknown,
): Promise<ServerActionResult<void>> {
  // 1. Zod parse
  const parsed = removePoLineItemSchema.safeParse(input);
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
  if (!appMeta.domains?.procurement?.includes("u")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Guard: the parent PO must be draft
  const { data: lineItem } = await supabase
    .from("purchase_order_items")
    .select("po_id")
    .eq("id", parsed.data.lineItemId)
    .single();
  if (!lineItem) {
    return fail("VALIDATION_FAILED", { form: "Line item not found" });
  }
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", lineItem.po_id)
    .single();
  if (!po || po.status !== "draft") {
    return fail("VALIDATION_FAILED", { form: "Line items can only be removed from draft POs" });
  }

  // 5. Execute mutation
  const { error } = await supabase
    .from("purchase_order_items")
    .delete()
    .eq("id", parsed.data.lineItemId);

  if (error) {
    const log = loggerWith({
      feature: "procurement",
      event: "remove-po-line-item",
      user_id: user.id,
    });
    log.error({ error: error.message }, "failed to remove PO line item");
    return fail("INTERNAL");
  }

  // 6. Invalidate cache
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
  revalidatePath(`/[locale]/management/procurement/purchase-orders/${lineItem.po_id}`, "page");

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "remove-po-line-item",
      user_id: user.id,
    });
    log.info(
      { line_item_id: parsed.data.lineItemId, po_id: lineItem.po_id },
      "removePoLineItem completed",
    );
  });

  return ok(undefined);
}
