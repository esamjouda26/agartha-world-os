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
import { updateOrderSchema } from "@/features/maintenance/schemas/upsert-order";

const limiter = createRateLimiter({
  tokens: ORDER_CRUD_RATE_LIMIT_TOKENS,
  window: ORDER_CRUD_RATE_LIMIT_WINDOW,
  prefix: "maintenance-update-order",
});

/**
 * Manager-side UPDATE for `maintenance_orders` (Dispatch Queue edits).
 * Pre-active rows only — once `status='active'` use the
 * complete-order/cancel-order paths.
 */
export async function updateOrder(
  input: unknown,
): Promise<ServerActionResult<{ orderId: string }>> {
  const parsed = updateOrderSchema.safeParse(input);
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

  const d = parsed.data;

  // Guard: only `draft` and `scheduled` rows are editable here. Once a
  // session is active, the form fields no longer represent the live
  // state (vendor MAC may have been authorized, etc.).
  const { error } = await supabase
    .from("maintenance_orders")
    .update({
      topology: d.topology,
      target_ci_id: d.targetDeviceId,
      vendor_id: d.vendorId,
      maintenance_start: new Date(d.maintenanceStart).toISOString(),
      maintenance_end: new Date(d.maintenanceEnd).toISOString(),
      mad_limit_minutes: d.madLimitMinutes,
      scope: d.scope,
      sponsor_id: d.sponsorId,
      switch_port: d.switchPort,
      network_group: d.networkGroup,
      vendor_mac_address: d.vendorMacAddress,
      updated_by: user.id,
    })
    .eq("id", d.id)
    .in("status", ["draft", "scheduled"]);

  if (error) {
    const log = loggerWith({
      feature: "maintenance",
      event: "update_order",
      user_id: user.id,
    });
    log.error({ code: error.code, message: error.message }, "UPDATE failed");
    return fail("INTERNAL");
  }

  for (const path of MAINTENANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "maintenance",
      event: "update_order",
      user_id: user.id,
    }).info({ orderId: d.id }, "updateOrder completed");
  });

  return ok({ orderId: d.id });
}
