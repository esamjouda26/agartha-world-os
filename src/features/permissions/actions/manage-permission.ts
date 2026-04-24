"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PERMISSIONS_ROUTER_PATHS } from "@/features/permissions/cache-tags";
import { upsertPermissionSchema } from "@/features/permissions/schemas/permission";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "permissions-matrix" });

/**
 * Upsert a single cell in the role_domain_permissions matrix.
 *
 * The DB trigger `trg_role_domain_permissions_changed` fires automatically
 * (init_schema.sql:568) and rebuilds the `app_metadata.domains` JSONB in
 * auth.users + stamps `profiles.last_permission_update`, invalidating stale
 * JWTs via `is_claims_fresh()`. No manual trigger invocation needed.
 */
export async function upsertPermission(
  input: unknown,
): Promise<ServerActionResult<{ roleId: string; domainId: string }>> {
  const parsed = upsertPermissionSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const systemAccess = appMeta.domains?.system ?? [];
  // Updating the matrix requires both c (insert new rows) and u (update existing)
  if (!systemAccess.includes("c") && !systemAccess.includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase.from("role_domain_permissions").upsert(
    {
      role_id: parsed.data.roleId,
      domain_id: parsed.data.domainId,
      can_create: parsed.data.canCreate,
      can_read: parsed.data.canRead,
      can_update: parsed.data.canUpdate,
      can_delete: parsed.data.canDelete,
      updated_by: user.id,
    },
    { onConflict: "role_id,domain_id" },
  );

  if (error) return fail("INTERNAL");

  for (const p of PERMISSIONS_ROUTER_PATHS) revalidatePath(p, "page");

  after(async () => {
    loggerWith({ feature: "permissions", event: "upsert-permission", user_id: user.id }).info(
      {
        role_id: parsed.data.roleId,
        domain_id: parsed.data.domainId,
        can_create: parsed.data.canCreate,
        can_read: parsed.data.canRead,
        can_update: parsed.data.canUpdate,
        can_delete: parsed.data.canDelete,
      },
      "permission cell upserted — DB trigger will refresh JWT metadata",
    );
  });

  return ok({ roleId: parsed.data.roleId, domainId: parsed.data.domainId });
}
