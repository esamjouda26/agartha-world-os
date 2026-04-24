"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEVICES_ROUTER_PATHS } from "@/features/devices/cache-tags";
import { updateDeviceSchema } from "@/features/devices/schemas/device";

const limiter = createRateLimiter({
  tokens: 20,
  window: "60 s",
  prefix: "devices-update",
});

/** Update an existing device — 8-step pipeline per prompt.md. */
export async function updateDevice(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  // 1. Zod parse
  const parsed = updateDeviceSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires it:u
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const itAccess = appMeta.domains?.it ?? [];
  if (!itAccess.includes("u")) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 5. Execute
  const {
    id,
    name,
    deviceTypeId,
    serialNumber,
    assetTag,
    zoneId,
    ipAddress,
    macAddress,
    vlanId,
    manufacturer,
    model,
    firmwareVersion,
    commissionDate,
    warrantyExpiry,
    maintenanceVendorId,
  } = parsed.data;

  const { error } = await supabase
    .from("devices")
    .update({
      name,
      device_type_id: deviceTypeId,
      serial_number: serialNumber || null,
      asset_tag: assetTag || null,
      zone_id: zoneId || null,
      ip_address: ipAddress || null,
      mac_address: macAddress || null,
      vlan_id: vlanId ?? null,
      manufacturer: manufacturer || null,
      model: model || null,
      firmware_version: firmwareVersion || null,
      commission_date: commissionDate || null,
      warranty_expiry: warrantyExpiry || null,
      maintenance_vendor_id: maintenanceVendorId || null,
      updated_by: user.id,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      const fields: Record<string, string> = {};
      if (error.message.includes("serial_number")) {
        fields.serialNumber = "Serial number already in use";
      } else if (error.message.includes("asset_tag")) {
        fields.assetTag = "Asset tag already in use";
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
  // Also bust the specific detail page
  revalidatePath(`/[locale]/admin/devices/${id}`, "page");

  after(async () => {
    loggerWith({ feature: "devices", event: "update", user_id: user.id }).info(
      { device_id: id },
      "device updated",
    );
  });

  return ok({ id });
}
