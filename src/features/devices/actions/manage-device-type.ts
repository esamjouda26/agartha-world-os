"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEVICES_ROUTER_PATHS } from "@/features/devices/cache-tags";
import { createDeviceTypeSchema, updateDeviceTypeSchema } from "@/features/devices/schemas/device";

const limiter = createRateLimiter({
  tokens: 20,
  window: "60 s",
  prefix: "device-types",
});

/** Create a device type — requires it:c. */
export async function createDeviceType(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createDeviceTypeSchema.safeParse(input);
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
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!appMeta.domains?.it?.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data, error } = await supabase
    .from("device_types")
    .insert({ name: parsed.data.name, display_name: parsed.data.displayName })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return fail("CONFLICT", { name: "Key already exists" });
    return fail("INTERNAL");
  }

  for (const path of DEVICES_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "devices", event: "create-device-type", user_id: user.id }).info(
      { device_type_id: data.id },
      "device type created",
    );
  });

  return ok({ id: data.id });
}

/** Update a device type's display name — requires it:u. */
export async function updateDeviceType(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = updateDeviceTypeSchema.safeParse(input);
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
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!appMeta.domains?.it?.includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("device_types")
    .update({ display_name: parsed.data.displayName })
    .eq("id", parsed.data.id);

  if (error) return fail("INTERNAL");

  for (const path of DEVICES_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "devices", event: "update-device-type", user_id: user.id }).info(
      { device_type_id: parsed.data.id },
      "device type updated",
    );
  });

  return ok({ id: parsed.data.id });
}
