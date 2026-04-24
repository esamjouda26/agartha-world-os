"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PERMISSIONS_ROUTER_PATHS } from "@/features/permissions/cache-tags";
import { createRoleSchema, updateRoleSchema } from "@/features/permissions/schemas/permission";

const limiter = createRateLimiter({ tokens: 10, window: "60 s", prefix: "permissions-roles" });

export async function createRole(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createRoleSchema.safeParse(input);
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
  if (!(appMeta.domains?.system ?? []).includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data, error } = await supabase
    .from("roles")
    .insert({
      name: parsed.data.name,
      display_name: parsed.data.displayName,
      access_level: parsed.data.accessLevel,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return fail("CONFLICT", { name: "Role name already exists" });
    return fail("INTERNAL");
  }

  for (const p of PERMISSIONS_ROUTER_PATHS) revalidatePath(p, "page");

  after(async () => {
    loggerWith({ feature: "permissions", event: "create-role", user_id: user.id }).info(
      { role_id: data.id },
      "role created",
    );
  });

  return ok({ id: data.id });
}

export async function updateRole(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = updateRoleSchema.safeParse(input);
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
  if (!(appMeta.domains?.system ?? []).includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("roles")
    .update({
      display_name: parsed.data.displayName,
      access_level: parsed.data.accessLevel,
      updated_by: user.id,
    })
    .eq("id", parsed.data.id);

  if (error) return fail("INTERNAL");

  for (const p of PERMISSIONS_ROUTER_PATHS) revalidatePath(p, "page");

  after(async () => {
    loggerWith({ feature: "permissions", event: "update-role", user_id: user.id }).info(
      { role_id: parsed.data.id },
      "role updated",
    );
  });

  return ok({ id: parsed.data.id });
}
