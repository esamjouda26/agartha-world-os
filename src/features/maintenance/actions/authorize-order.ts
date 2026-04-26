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
import {
  AUTHORIZE_RATE_LIMIT_TOKENS,
  AUTHORIZE_RATE_LIMIT_WINDOW,
  MACADDR_REGEX,
} from "@/features/maintenance/constants";

const schema = z.object({
  orderId: z.string().min(1),
  vendorMacAddress: z
    .string()
    .regex(MACADDR_REGEX, "Invalid MAC address format (e.g. AA:BB:CC:DD:EE:FF)"),
});

const limiter = createRateLimiter({
  tokens: AUTHORIZE_RATE_LIMIT_TOKENS,
  window: AUTHORIZE_RATE_LIMIT_WINDOW,
  prefix: "maintenance-authorize",
});

/**
 * Authorize vendor for onsite maintenance order (status: scheduled → active).
 * Sets vendor_mac_address, authorized_at, authorized_by.
 * init_schema.sql:3573 — maintenance_orders.
 */
export async function authorizeOrderAction(
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
      status: "active",
      vendor_mac_address: parsed.data.vendorMacAddress,
      authorized_at: now,
      authorized_by: user.id,
      updated_by: user.id,
    })
    .eq("id", parsed.data.orderId)
    .eq("status", "scheduled");

  if (error) return fail("INTERNAL");

  for (const path of MAINTENANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "maintenance", event: "authorize_order", user_id: user.id }).info(
      { orderId: parsed.data.orderId },
      "authorizeOrderAction completed",
    );
  });

  return ok({ orderId: parsed.data.orderId });
}
