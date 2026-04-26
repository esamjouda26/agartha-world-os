"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROCUREMENT_ROUTER_PATHS } from "@/features/procurement/cache-tags";
import {
  PO_CRUD_RATE_TOKENS,
  PO_CRUD_RATE_WINDOW,
} from "@/features/procurement/constants";
import { updateSupplierSchema } from "@/features/procurement/schemas/supplier";

const limiter = createRateLimiter({
  tokens: PO_CRUD_RATE_TOKENS,
  window: PO_CRUD_RATE_WINDOW,
  prefix: "procurement-update-supplier",
});

/**
 * Update a supplier — 8-step enterprise pipeline.
 *
 * Spec: "Edit supplier: inline form → Server Action → UPDATE suppliers → revalidatePath"
 * RBAC: procurement:u.
 */
export async function updateSupplier(
  input: unknown,
): Promise<ServerActionResult<{ supplierId: string }>> {
  // 1. Zod parse
  const parsed = updateSupplierSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.procurement?.includes("u")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Execute mutation
  const d = parsed.data;
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: d.name,
      contact_email: d.contactEmail || null,
      contact_phone: d.contactPhone || null,
      address: d.address || null,
      description: d.description || null,
      is_active: d.isActive,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.supplierId);

  if (error) {
    const log = loggerWith({
      feature: "procurement",
      event: "update-supplier",
      user_id: user.id,
    });
    log.error({ error: error.message }, "failed to update supplier");
    return fail("INTERNAL");
  }

  // 5. Invalidate cache
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
  revalidatePath(
    `/[locale]/management/procurement/suppliers/${d.supplierId}`,
    "page",
  );

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "update-supplier",
      user_id: user.id,
    });
    log.info({ supplier_id: d.supplierId }, "updateSupplier completed");
  });

  return ok({ supplierId: d.supplierId });
}
