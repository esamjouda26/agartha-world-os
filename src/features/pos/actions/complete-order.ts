"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POS_ROUTER_PATHS } from "@/features/pos/cache-tags";
import {
  COMPLETE_ORDER_RATE_LIMIT_TOKENS,
  COMPLETE_ORDER_RATE_LIMIT_WINDOW,
} from "@/features/pos/constants";

const limiter = createRateLimiter({
  tokens: COMPLETE_ORDER_RATE_LIMIT_TOKENS,
  window: COMPLETE_ORDER_RATE_LIMIT_WINDOW,
  prefix: "pos-complete-order",
});

const inputSchema = z.object({ orderId: z.guid() });

/**
 * Mark a POS order as completed from the KDS view.
 * UPDATE orders SET status = 'completed', completed_at = NOW()
 * Trigger trg_order_completion_goods_movement fires server-side (BOM + stock).
 * init_schema.sql:3022
 */
export async function completeOrderAction(
  orderId: string,
): Promise<ServerActionResult<{ orderId: string }>> {
  const parsed = inputSchema.safeParse({ orderId });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC (pos:u to complete)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!appMeta.domains?.pos?.includes("u")) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 5. Execute mutation
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("orders")
    .update({ status: "completed", completed_at: now, updated_by: user.id })
    .eq("id", parsed.data.orderId)
    .eq("status", "preparing");

  if (error) return fail("INTERNAL");

  // 7. Cache invalidation
  for (const path of POS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({ feature: "pos", event: "complete_order", user_id: user.id });
    log.info({ orderId: parsed.data.orderId }, "completeOrderAction completed");
  });

  return ok({ orderId: parsed.data.orderId });
}
