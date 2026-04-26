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
import { completeOrderSchema } from "@/features/maintenance/schemas/upsert-order";

const limiter = createRateLimiter({
  tokens: ORDER_CRUD_RATE_LIMIT_TOKENS,
  window: ORDER_CRUD_RATE_LIMIT_WINDOW,
  prefix: "maintenance-complete-order",
});

/**
 * Manager-side "Complete" for an active maintenance session
 * (frontend_spec.md:2691). Mirrors the crew-side `revokeOrderAction` —
 * sets sponsor_remark, completed_at, and flips status active→completed.
 *
 * Vendor MAC instantly vanishes from `get_active_vendors_for_radius()`
 * (init_schema.sql:3654 — filters on status='active').
 */
export async function completeOrder(
  input: unknown,
): Promise<ServerActionResult<{ orderId: string }>> {
  const parsed = completeOrderSchema.safeParse(input);
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

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("maintenance_orders")
    .update({
      status: "completed",
      sponsor_remark: parsed.data.sponsorRemark,
      completed_at: now,
      updated_by: user.id,
    })
    .eq("id", parsed.data.id)
    .eq("status", "active");

  if (error) {
    const log = loggerWith({
      feature: "maintenance",
      event: "complete_order",
      user_id: user.id,
    });
    log.error({ code: error.code, message: error.message }, "complete failed");
    return fail("INTERNAL");
  }

  for (const path of MAINTENANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "maintenance",
      event: "complete_order",
      user_id: user.id,
    }).info({ orderId: parsed.data.id }, "completeOrder completed");
  });

  return ok({ orderId: parsed.data.id });
}
