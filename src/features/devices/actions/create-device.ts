"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEVICES_ROUTER_PATHS } from "@/features/devices/cache-tags";
import { createDeviceSchema } from "@/features/devices/schemas/device";

const limiter = createRateLimiter({
  tokens: 10,
  window: "60 s",
  prefix: "devices-create",
});

/** Create a new device — 8-step pipeline per prompt.md. */
export async function createDevice(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  // 1. Zod parse
  const parsed = createDeviceSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires it:c
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const itAccess = appMeta.domains?.it ?? [];
  if (!itAccess.includes("c")) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. (No idempotency key required for device creation)

  // 5. Execute
  const {
    name,
    deviceTypeId,
    serialNumber,
    assetTag,
    zoneId,
    ipAddress,
    macAddress,
    vlanId,
    parentDeviceId,
    manufacturer,
    model,
    firmwareVersion,
    commissionDate,
    warrantyExpiry,
    maintenanceVendorId,
  } = parsed.data;

  const { data, error } = await supabase
    .from("devices")
    .insert({
      name,
      device_type_id: deviceTypeId,
      serial_number: serialNumber || null,
      asset_tag: assetTag || null,
      zone_id: zoneId || null,
      ip_address: ipAddress || null,
      mac_address: macAddress || null,
      vlan_id: vlanId ?? null,
      parent_device_id: parentDeviceId || null,
      manufacturer: manufacturer || null,
      model: model || null,
      firmware_version: firmwareVersion || null,
      commission_date: commissionDate || null,
      warranty_expiry: warrantyExpiry || null,
      maintenance_vendor_id: maintenanceVendorId || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation (serial_number or asset_tag)
      const fields: Record<string, string> = {};
      if (error.message.includes("serial_number")) {
        fields.serialNumber = "Serial number already exists";
      } else if (error.message.includes("asset_tag")) {
        fields.assetTag = "Asset tag already exists";
      } else {
        fields.form = "A device with these details already exists";
      }
      return fail("CONFLICT", fields);
    }
    return fail("INTERNAL");
  }

  // 7. Invalidate cache — per ADR-0006
  for (const path of DEVICES_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "devices", event: "create", user_id: user.id }).info(
      { device_id: data.id },
      "device created",
    );
  });

  return ok({ id: data.id });
}
