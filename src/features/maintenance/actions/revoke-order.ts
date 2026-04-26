"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MAINTENANCE_ROUTER_PATHS } from "@/features/maintenance/cache-tags";
import { REVOKE_RATE_LIMIT_TOKENS, REVOKE_RATE_LIMIT_WINDOW } from "@/features/maintenance/constants";

const schema = z.object({
  orderId: z.string().min(1),
  sponsorRemark: z.string().min(1, "Remark is required"),
});

const limiter = createRateLimiter({
  tokens: REVOKE_RATE_LIMIT_TOKENS,
  window: REVOKE_RATE_LIMIT_WINDOW,
  prefix: "maintenance-revoke",
});

/**
 * Revoke/complete a work order (status: active → completed).
 * Sets sponsor_remark, completed_at.
 * init_schema.sql:3573 — maintenance_orders.
 */
export async function revokeOrderAction(
  input: unknown,
): Promise<ServerActionResult<{ orderId: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!appMeta.domains?.maintenance?.includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("maintenance_orders")
    .update({
      status: "completed",
      sponsor_remark: parsed.data.sponsorRemark,
      completed_at: now,
      updated_by: user.id,
    })
    .eq("id", parsed.data.orderId)
    .eq("status", "active");

  if (error) return fail("INTERNAL");

  for (const path of MAINTENANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "maintenance", event: "revoke_order", user_id: user.id }).info(
      { orderId: parsed.data.orderId },
      "revokeOrderAction completed",
    );
  });

  return ok({ orderId: parsed.data.orderId });
}
