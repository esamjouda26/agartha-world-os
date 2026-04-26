"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HR_ROUTER_PATHS } from "@/features/hr/cache-tags";

const limiter = createRateLimiter({ tokens: 10, window: "60 s", prefix: "leave-cancel" });

/**
 * Cancel own pending leave request via rpc_cancel_leave_request.
 * init_schema.sql:5967 — rpc_cancel_leave_request(p_leave_request_id).
 */
export async function cancelLeaveRequestAction(
  leaveRequestId: string,
): Promise<ServerActionResult<{ leaveRequestId: string }>> {
  if (!leaveRequestId) return fail("VALIDATION_FAILED");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!appMeta.domains?.hr?.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase.rpc("rpc_cancel_leave_request", {
    p_leave_request_id: leaveRequestId,
  });

  if (error) {
    if (error.message.includes("NOT_FOUND") || error.message.includes("not found"))
      return fail("NOT_FOUND");
    if (error.message.includes("already")) return fail("CONFLICT");
    return fail("INTERNAL");
  }

  for (const path of HR_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "hr", event: "cancel_leave_request", user_id: user.id }).info(
      { leaveRequestId },
      "cancelLeaveRequestAction completed",
    );
  });

  return ok({ leaveRequestId });
}
