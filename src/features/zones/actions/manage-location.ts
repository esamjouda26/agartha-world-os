"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ZONES_ROUTER_PATHS } from "@/features/zones/cache-tags";
import { createLocationSchema, updateLocationSchema } from "@/features/zones/schemas/zone";

const limiter = createRateLimiter({ tokens: 20, window: "60 s", prefix: "zones-location" });

function requireSystemWrite(domains: Record<string, string[]>, access: "c" | "u" | "d"): boolean {
  return (domains.system ?? []).includes(access);
}

export async function createLocation(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createLocationSchema.safeParse(input);
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
  if (!requireSystemWrite(appMeta.domains ?? {}, "c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data, error } = await supabase
    .from("locations")
    .insert({
      name: parsed.data.name,
      org_unit_id: parsed.data.orgUnitId ?? null,
      is_active: parsed.data.isActive,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return fail("CONFLICT", { name: "Location name already exists" });
    return fail("INTERNAL");
  }

  for (const path of ZONES_ROUTER_PATHS) revalidatePath(path, "page");

  after(async () => {
    loggerWith({ feature: "zones", event: "create-location", user_id: user.id }).info(
      { location_id: data.id },
      "location created",
    );
  });

  return ok({ id: data.id });
}

export async function updateLocation(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = updateLocationSchema.safeParse(input);
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
  if (!requireSystemWrite(appMeta.domains ?? {}, "u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("locations")
    .update({
      name: parsed.data.name,
      org_unit_id: parsed.data.orgUnitId ?? null,
      is_active: parsed.data.isActive,
      updated_by: user.id,
    })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") return fail("CONFLICT", { name: "Location name already exists" });
    return fail("INTERNAL");
  }

  for (const path of ZONES_ROUTER_PATHS) revalidatePath(path, "page");

  after(async () => {
    loggerWith({ feature: "zones", event: "update-location", user_id: user.id }).info(
      { location_id: parsed.data.id },
      "location updated",
    );
  });

  return ok({ id: parsed.data.id });
}
