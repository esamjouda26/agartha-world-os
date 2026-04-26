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
import { updatePurchaseOrderSchema } from "@/features/procurement/schemas/purchase-order";

const limiter = createRateLimiter({
  tokens: PO_CRUD_RATE_TOKENS,
  window: PO_CRUD_RATE_WINDOW,
  prefix: "procurement-update-po",
});

/**
 * Update a draft PO — 8-step enterprise pipeline.
 *
 * Spec: "Edit PO (draft only): fields — expected_delivery_date, notes
 *        → Server Action → UPDATE purchase_orders → revalidatePath"
 * RBAC: procurement:u.
 */
export async function updatePurchaseOrder(
  input: unknown,
): Promise<ServerActionResult<{ poId: string }>> {
  // 1. Zod parse
  const parsed = updatePurchaseOrderSchema.safeParse(input);
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

  // 4. Guard: only draft POs can be edited
  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", parsed.data.poId)
    .single();
  if (!existing || existing.status !== "draft") {
    return fail("VALIDATION_FAILED", { form: "Only draft POs can be edited" });
  }

  // 5. Execute mutation
  const d = parsed.data;
  const { error } = await supabase
    .from("purchase_orders")
    .update({
      expected_delivery_date: d.expectedDeliveryDate || null,
      notes: d.notes || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.poId);

  if (error) {
    const log = loggerWith({
      feature: "procurement",
      event: "update-po",
      user_id: user.id,
    });
    log.error({ error: error.message }, "failed to update PO");
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
      event: "update-po",
      user_id: user.id,
    });
    log.info({ po_id: d.poId }, "updatePurchaseOrder completed");
  });

  return ok({ poId: d.poId });
}
