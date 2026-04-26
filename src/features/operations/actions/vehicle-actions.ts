"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OPERATIONS_ROUTER_PATHS } from "@/features/operations/cache-tags";
import { createVehicleSchema, updateVehicleSchema } from "@/features/operations/schemas/vehicle";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "ops-vehicles" });

function invalidateCache() {
  for (const path of OPERATIONS_ROUTER_PATHS) revalidatePath(path, "page");
}

export async function createVehicle(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createVehicleSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!(appMeta.domains?.ops ?? []).includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  const { data: record, error } = await supabase
    .from("vehicles")
    .insert({ name: d.name, plate: d.plate, vehicle_type: d.vehicleType, status: d.status, zone_id: d.zoneId, created_by: user.id })
    .select("id")
    .single();

  if (error || !record) {
    loggerWith({ feature: "operations", event: "create-vehicle", user_id: user.id }).error({ error: error?.message }, "failed");
    return fail("INTERNAL");
  }

  invalidateCache();
  after(async () => { loggerWith({ feature: "operations", event: "create-vehicle", user_id: user.id }).info({ vehicle_id: record.id }, "done"); });
  return ok({ id: record.id });
}

export async function updateVehicle(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = updateVehicleSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!(appMeta.domains?.ops ?? []).includes("u") && !(appMeta.domains?.ops ?? []).includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  const { error } = await supabase
    .from("vehicles")
    .update({ name: d.name, plate: d.plate, vehicle_type: d.vehicleType, status: d.status, zone_id: d.zoneId, updated_by: user.id })
    .eq("id", d.id);

  if (error) {
    loggerWith({ feature: "operations", event: "update-vehicle", user_id: user.id }).error({ error: error.message }, "failed");
    return fail("INTERNAL");
  }

  invalidateCache();
  after(async () => { loggerWith({ feature: "operations", event: "update-vehicle", user_id: user.id }).info({ vehicle_id: d.id }, "done"); });
  return ok({ id: d.id });
}

export async function deleteVehicle(vehicleId: string): Promise<ServerActionResult<{ id: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!(appMeta.domains?.ops ?? []).includes("d")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
  if (error) {
    loggerWith({ feature: "operations", event: "delete-vehicle", user_id: user.id }).error({ error: error.message }, "failed");
    return fail("INTERNAL");
  }

  invalidateCache();
  after(async () => { loggerWith({ feature: "operations", event: "delete-vehicle", user_id: user.id }).info({ vehicle_id: vehicleId }, "done"); });
  return ok({ id: vehicleId });
}
