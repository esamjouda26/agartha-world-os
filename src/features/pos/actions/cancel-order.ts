"use server";

import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POS_ROUTER_PATHS } from "@/features/pos/cache-tags";

const cancelOrderSchema = z.object({
  orderId: z.guid(),
  reason: z.string().min(1, "Reason is required").max(500),
});

const limiter = createRateLimiter({ tokens: 30, window: "60 s", prefix: "pos-cancel-order" });

/**
 * Cancel a preparing order with a required reason.
 * Schema: init_schema.sql:3022 — orders
 * RLS: UPDATE requires pos:u (init_schema.sql:3123-3125)
 * Reason stored in orders.notes column.
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

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!appMeta.domains?.pos?.includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { orderId, reason } = parsed.data;

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled", notes: reason, updated_by: user.id })
    .eq("id", orderId)
    .eq("status", "preparing");

  if (error) {
    loggerWith({ feature: "pos", event: "cancel-order", user_id: user.id }).error(
      { error: error.message },
      "failed to cancel order",
    );
    return fail("INTERNAL");
  }

  for (const path of POS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "pos", event: "cancel-order", user_id: user.id }).info(
      { order_id: orderId },
      "cancelOrder completed",
    );
  });

  return ok({ orderId });
}
