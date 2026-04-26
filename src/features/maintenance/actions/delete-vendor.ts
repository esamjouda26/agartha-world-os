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
  VENDOR_CRUD_RATE_LIMIT_TOKENS,
  VENDOR_CRUD_RATE_LIMIT_WINDOW,
} from "@/features/maintenance/constants";
import { deleteVendorSchema } from "@/features/maintenance/schemas/upsert-vendor";

const limiter = createRateLimiter({
  tokens: VENDOR_CRUD_RATE_LIMIT_TOKENS,
  window: VENDOR_CRUD_RATE_LIMIT_WINDOW,
  prefix: "maintenance-delete-vendor",
});

/**
 * DELETE path for `maintenance_vendors`. The schema FK
 * `devices.maintenance_vendor_id` is `ON DELETE SET NULL` and
 * `maintenance_orders.vendor_id` is `ON DELETE RESTRICT`
 * (init_schema.sql:3578) — Postgres rejects the delete if any work
 * order still references the vendor. Surface that as CONFLICT so the
 * UI can prompt the manager to set is_active=false instead.
 */
export async function deleteVendor(
  input: unknown,
): Promise<ServerActionResult<{ vendorId: string }>> {
  const parsed = deleteVendorSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.maintenance?.includes("d")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("maintenance_vendors")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    // PG23503 = foreign_key_violation — vendor still has WO history.
    if (error.code === "23503") return fail("CONFLICT");
    loggerWith({
      feature: "maintenance",
      event: "delete_vendor",
      user_id: user.id,
    }).error({ code: error.code, message: error.message }, "DELETE failed");
    return fail("INTERNAL");
  }

  for (const path of MAINTENANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "maintenance",
      event: "delete_vendor",
      user_id: user.id,
    }).info({ vendorId: parsed.data.id }, "deleteVendor completed");
  });

  return ok({ vendorId: parsed.data.id });
}
