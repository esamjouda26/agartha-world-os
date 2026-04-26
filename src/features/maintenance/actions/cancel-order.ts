"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MAINTENANCE_ROUTER_PATHS } from "@/features/maintenance/cache-tags";
import {
  ORDER_CRUD_RATE_LIMIT_TOKENS,
  ORDER_CRUD_RATE_LIMIT_WINDOW,
} from "@/features/maintenance/constants";
import { cancelOrderSchema } from "@/features/maintenance/schemas/upsert-order";

const limiter = createRateLimiter({
  tokens: ORDER_CRUD_RATE_LIMIT_TOKENS,
  window: ORDER_CRUD_RATE_LIMIT_WINDOW,
  prefix: "maintenance-cancel-order",
});

/**
 * Cancel a work order from any non-finalized state
 * (frontend_spec.md:2690 — "any → cancelled"). Used by:
 *   - "Kill Session" on an active row (frontend_spec.md:2692)
 *   - Cancel from the dispatch queue (draft/scheduled rows)
 *
 * The cancellation reason is stored in `sponsor_remark` so the audit
 * trail surfaces a single column for both completion notes and
 * cancellation reasons.
 */
export async function cancelOrder(
  input: unknown,
): Promise<ServerActionResult<{ orderId: string }>> {
  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.maintenance?.includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("maintenance_orders")
    .update({
      status: "cancelled",
      sponsor_remark: parsed.data.reason,
      updated_by: user.id,
    })
    .eq("id", parsed.data.id)
    .in("status", ["draft", "scheduled", "active"]);

  if (error) {
    const log = loggerWith({
      feature: "maintenance",
      event: "cancel_order",
      user_id: user.id,
    });
    log.error({ code: error.code, message: error.message }, "cancel failed");
    return fail("INTERNAL");
  }

  for (const path of MAINTENANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "maintenance",
      event: "cancel_order",
      user_id: user.id,
    }).info({ orderId: parsed.data.id }, "cancelOrder completed");
  });

  return ok({ orderId: parsed.data.id });
}
