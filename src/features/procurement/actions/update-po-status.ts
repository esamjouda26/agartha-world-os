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
import { updatePoStatusSchema } from "@/features/procurement/schemas/purchase-order";

const limiter = createRateLimiter({
  tokens: PO_CRUD_RATE_TOKENS,
  window: PO_CRUD_RATE_WINDOW,
  prefix: "procurement-update-po-status",
});

/**
 * Allowed status transitions per WF-9 state machine:
 *   draft → sent  (mark as sent)
 *   partially_received → completed  (force complete for short-ships)
 *   draft | sent | partially_received → cancelled
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["cancelled"],
  partially_received: ["completed", "cancelled"],
};

/**
 * Update PO status — 8-step enterprise pipeline.
 *
 * Spec INTERACTIONS:
 *   - "Mark as sent: button → UPDATE status = 'sent'"
 *   - "Force complete: button → UPDATE status = 'completed'"
 *   - "Cancel: button → UPDATE status = 'cancelled'"
 * RBAC: procurement:u.
 */
export async function updatePoStatus(
  input: unknown,
): Promise<ServerActionResult<{ poId: string; newStatus: string }>> {
  // 1. Zod parse
  const parsed = updatePoStatusSchema.safeParse(input);
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

  // 4. Guard: validate state transition
  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", parsed.data.poId)
    .single();
  if (!existing) {
    return fail("VALIDATION_FAILED", { form: "PO not found" });
  }
  const currentStatus = existing.status ?? "draft";
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return fail("VALIDATION_FAILED", {
      form: `Cannot transition from "${currentStatus}" to "${parsed.data.status}"`,
    });
  }

  // 5. Execute mutation
  const d = parsed.data;
  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: d.status,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.poId);

  if (error) {
    const log = loggerWith({
      feature: "procurement",
      event: "update-po-status",
      user_id: user.id,
    });
    log.error({ error: error.message }, "failed to update PO status");
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
      event: "update-po-status",
      user_id: user.id,
    });
    log.info(
      { po_id: d.poId, from: currentStatus, to: d.status },
      "updatePoStatus completed",
    );
  });

  return ok({ poId: d.poId, newStatus: d.status });
}
