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
import { createPurchaseOrderSchema } from "@/features/procurement/schemas/purchase-order";

const limiter = createRateLimiter({
  tokens: PO_CRUD_RATE_TOKENS,
  window: PO_CRUD_RATE_WINDOW,
  prefix: "procurement-create-po",
});

/**
 * Create a new purchase order — 8-step enterprise pipeline.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/purchase-orders` INTERACTIONS.
 * RBAC: procurement:c.
 * INSERT purchase_orders → revalidatePath (ADR-0006).
 */
export async function createPurchaseOrder(
  input: unknown,
): Promise<ServerActionResult<{ poId: string }>> {
  // 1. Zod parse
  const parsed = createPurchaseOrderSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires procurement:c
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

  // 4. Execute mutation
  const d = parsed.data;
  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      supplier_id: d.supplierId,
      receiving_location_id: d.receivingLocationId,
      order_date: d.orderDate,
      expected_delivery_date: d.expectedDeliveryDate || null,
      notes: d.notes || null,
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !po) {
    const log = loggerWith({
      feature: "procurement",
      event: "create-po",
      user_id: user.id,
    });
    log.error({ error: error?.message }, "failed to create PO");
    return fail("INTERNAL");
  }

  // 5. Invalidate cache
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "create-po",
      user_id: user.id,
    });
    log.info({ po_id: po.id }, "createPurchaseOrder completed");
  });

  return ok({ poId: po.id });
}
