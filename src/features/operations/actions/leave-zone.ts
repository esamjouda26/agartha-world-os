"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OPERATIONS_ROUTER_PATHS } from "@/features/operations/cache-tags";

const limiter = createRateLimiter({ tokens: 60, window: "60 s", prefix: "zone-leave" });

/**
 * Declare leaving the current zone (set left_at = NOW()).
 * init_schema.sql:1116 — crew_zones.
 */
export async function leaveZoneAction(): Promise<ServerActionResult<{ updated: boolean }>> {
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
  const { error } = await supabase
    .from("crew_zones")
    .update({ left_at: now })
    .eq("staff_record_id", profile.staff_record_id)
    .is("left_at", null);

  if (error) return fail("INTERNAL");

  for (const path of OPERATIONS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "operations", event: "leave_zone", user_id: user.id }).info(
      {},
      "leaveZoneAction completed",
    );
  });

  return ok({ updated: true });
}
