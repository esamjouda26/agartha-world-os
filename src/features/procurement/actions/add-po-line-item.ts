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
import { addPoLineItemSchema } from "@/features/procurement/schemas/purchase-order";

const limiter = createRateLimiter({
  tokens: PO_CRUD_RATE_TOKENS,
  window: PO_CRUD_RATE_WINDOW,
  prefix: "procurement-add-po-item",
});

/**
 * Add a line item to a draft PO — 8-step enterprise pipeline.
 *
 * Spec: "Add line items (draft only): material_id, expected_qty, unit_price
 *        → Server Action → INSERT purchase_order_items → revalidatePath"
 * RBAC: procurement:c.
 */
export async function addPoLineItem(
  input: unknown,
): Promise<ServerActionResult<{ itemId: string }>> {
  // 1. Zod parse
  const parsed = addPoLineItemSchema.safeParse(input);
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
  if (!appMeta.domains?.procurement?.includes("c")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Guard: only draft POs accept new items
  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", parsed.data.poId)
    .single();
  if (!existing || existing.status !== "draft") {
    return fail("VALIDATION_FAILED", { form: "Line items can only be added to draft POs" });
  }

  // 5. Execute mutation
  const d = parsed.data;
  const { data: item, error } = await supabase
    .from("purchase_order_items")
    .insert({
      po_id: d.poId,
      material_id: d.materialId,
      expected_qty: d.expectedQty,
      unit_price: d.unitPrice,
    })
    .select("id")
    .single();

  if (error || !item) {
    const log = loggerWith({
      feature: "procurement",
      event: "add-po-line-item",
      user_id: user.id,
    });
    log.error({ error: error?.message }, "failed to add PO line item");
    return fail("INTERNAL");
  }

  // 6. Invalidate cache
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
  revalidatePath(`/[locale]/management/procurement/purchase-orders/${d.poId}`, "page");

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "add-po-line-item",
      user_id: user.id,
    });
    log.info({ po_id: d.poId, item_id: item.id }, "addPoLineItem completed");
  });

  return ok({ itemId: item.id });
}
