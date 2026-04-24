"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ORG_UNITS_ROUTER_PATHS } from "@/features/org-units/cache-tags";
import { createOrgUnitSchema, updateOrgUnitSchema } from "@/features/org-units/schemas/org-unit";

const limiter = createRateLimiter({ tokens: 10, window: "60 s", prefix: "org-units" });

/**
 * Create a new org unit.
 *
 * Path computation: if no parent, path = code. If parent provided,
 * fetch parent.path first, then path = parent_path + '.' + code.
 * This is pure string arithmetic — no multi-table mutation.
 * Reparenting (changing path/parent of an existing node) requires a
 * `reparent_org_unit` RPC that does NOT exist in migrations — omitted.
 */
export async function createOrgUnit(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createOrgUnitSchema.safeParse(input);
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

  // Compute ltree path
  let path = parsed.data.code;
  if (parsed.data.parentId) {
    const { data: parent, error: parentErr } = await supabase
      .from("org_units")
      .select("path")
      .eq("id", parsed.data.parentId)
      .maybeSingle();
    if (parentErr || !parent) return fail("NOT_FOUND");
    path = `${String(parent.path)}.${parsed.data.code}`;
  }

  const { data, error } = await supabase
    .from("org_units")
    .insert({
      code: parsed.data.code,
      name: parsed.data.name,
      unit_type: parsed.data.unitType,
      parent_id: parsed.data.parentId ?? null,
      path: path as unknown as never, // ltree type — Supabase accepts string
      is_active: parsed.data.isActive,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return fail("CONFLICT", { code: "Code already exists" });
    return fail("INTERNAL");
  }

  for (const p of ORG_UNITS_ROUTER_PATHS) revalidatePath(p, "page");

  after(async () => {
    loggerWith({ feature: "org-units", event: "create", user_id: user.id }).info(
      { org_unit_id: data.id },
      "org unit created",
    );
  });

  return ok({ id: data.id });
}

/**
 * Update org unit name, type, and is_active status.
 * Code / path / parent changes are NOT supported — no `reparent_org_unit`
 * RPC exists in migrations (init_schema.sql). Flagged in Phase 6 gate.
 */
export async function updateOrgUnit(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = updateOrgUnitSchema.safeParse(input);
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
    .from("org_units")
    .update({
      name: parsed.data.name,
      unit_type: parsed.data.unitType,
      is_active: parsed.data.isActive,
      updated_by: user.id,
    })
    .eq("id", parsed.data.id);

  if (error) return fail("INTERNAL");

  for (const p of ORG_UNITS_ROUTER_PATHS) revalidatePath(p, "page");

  after(async () => {
    loggerWith({ feature: "org-units", event: "update", user_id: user.id }).info(
      { org_unit_id: parsed.data.id },
      "org unit updated",
    );
  });

  return ok({ id: parsed.data.id });
}
