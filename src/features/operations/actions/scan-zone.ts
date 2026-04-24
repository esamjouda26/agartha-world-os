"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OPERATIONS_ROUTER_PATHS } from "@/features/operations/cache-tags";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "zone-scan" });

/**
 * Declare entry into a zone by scanning its QR code.
 * Trigger trg_crew_zones_auto_close fires server-side (closes previous open zone).
 * init_schema.sql:1116 — crew_zones; Tier 2 universal insert.
 */
export async function scanZoneAction(
  zoneId: string,
): Promise<ServerActionResult<{ entryId: string }>> {
  if (!zoneId?.trim()) return fail("VALIDATION_FAILED", { zoneId: "Zone ID is required" });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data: profile } = await supabase
    .from("profiles")
    .select("staff_record_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.staff_record_id) return fail("FORBIDDEN");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("crew_zones")
    .insert({
      staff_record_id: profile.staff_record_id,
      zone_id: zoneId,
      scanned_at: now,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23503") return fail("NOT_FOUND"); // FK violation: unknown zone_id
    return fail("INTERNAL");
  }

  for (const path of OPERATIONS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "operations", event: "scan_zone", user_id: user.id }).info(
      { zoneId, entryId: data.id },
      "scanZoneAction completed",
    );
  });

  return ok({ entryId: data.id });
}
