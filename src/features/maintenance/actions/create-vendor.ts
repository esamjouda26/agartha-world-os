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
import { createVendorSchema } from "@/features/maintenance/schemas/upsert-vendor";

const limiter = createRateLimiter({
  tokens: VENDOR_CRUD_RATE_LIMIT_TOKENS,
  window: VENDOR_CRUD_RATE_LIMIT_WINDOW,
  prefix: "maintenance-create-vendor",
});

/**
 * INSERT path for `maintenance_vendors` per
 * `/management/maintenance/vendors` (frontend_spec.md:2728).
 */
export async function createVendor(
  input: unknown,
): Promise<ServerActionResult<{ vendorId: string }>> {
  const parsed = createVendorSchema.safeParse(input);
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
    .from("maintenance_vendors")
    .insert({
      name: d.name,
      contact_email: d.contactEmail,
      contact_phone: d.contactPhone,
      specialization: d.specialization,
      description: d.description,
      is_active: d.isActive,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !row) {
    loggerWith({
      feature: "maintenance",
      event: "create_vendor",
      user_id: user.id,
    }).error({ code: error?.code, message: error?.message }, "INSERT failed");
    return fail("INTERNAL");
  }

  for (const path of MAINTENANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({
      feature: "maintenance",
      event: "create_vendor",
      user_id: user.id,
    }).info({ vendorId: row.id }, "createVendor completed");
  });

  return ok({ vendorId: row.id });
}
