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
import { createOrderSchema } from "@/features/maintenance/schemas/upsert-order";

const limiter = createRateLimiter({
  tokens: ORDER_CRUD_RATE_LIMIT_TOKENS,
  window: ORDER_CRUD_RATE_LIMIT_WINDOW,
  prefix: "maintenance-create-order",
});

/**
 * Manager-side INSERT path for `maintenance_orders` per
 * `/management/maintenance/orders` (frontend_spec.md:2689) and WF-15
 * (operational_workflows.md:1312-1316).
 *
 * Pipeline (CLAUDE.md §4):
 *   1. Zod parse
 *   2. AuthN + RBAC (maintenance:c)
 *   3. Rate limit
 *   4. INSERT maintenance_orders — status defaults to 'scheduled' when
 *      maintenance_start/end are filled (per WF-15:1315 "Manager
 *      schedules → status: scheduled").
 *   5. Per-feature revalidatePath (ADR-0006)
 *   6. Structured log via after()
 */
export async function createOrder(
  input: unknown,
): Promise<ServerActionResult<{ orderId: string }>> {
  const parsed = createOrderSchema.safeParse(input);
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
  if (!appMeta.domains?.maintenance?.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;

  const { data: row, error } = await supabase
    .from("maintenance_orders")
    .insert({
      topology: d.topology,
      status: "scheduled",
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
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !row) {
    const log = loggerWith({
      feature: "maintenance",
      event: "create_order",
      user_id: user.id,
    });
    log.error({ code: error?.code, message: error?.message }, "INSERT failed");
    return fail("INTERNAL");
  }

  for (const path of MAINTENANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "maintenance",
      event: "create_order",
      user_id: user.id,
    }).info({ orderId: row.id, topology: d.topology }, "createOrder completed");
  });

  return ok({ orderId: row.id });
}
