"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HR_ROUTER_PATHS } from "@/features/hr/cache-tags";
import { ATTENDANCE_ROUTER_PATHS } from "@/features/attendance/cache-tags";
import { rejectClarificationSchema } from "@/features/hr/schemas/attendance-management";

const limiter = createRateLimiter({
  tokens: 10,
  window: "1 m",
  prefix: "hr-clarification-reject",
});

/**
 * HR-only. Reject a pending clarification with a reason stored in
 * `hr_note`. Staff may resubmit via `submitClarificationAction`, which
 * flips the row back to `pending_review`.
 *
 * Wraps `rpc_reject_exception_clarification`. Consumer:
 * `/management/hr/attendance/queue`
 */
export async function rejectClarificationAction(
  input: unknown,
): Promise<ServerActionResult<{ exceptionId: string }>> {
  const parsed = rejectClarificationSchema.safeParse(input);
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
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase.rpc("rpc_reject_exception_clarification", {
    p_exception_id: parsed.data.exceptionId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    if (error.message.includes("EXCEPTION_NOT_FOUND")) return fail("NOT_FOUND");
    if (error.message.includes("FORBIDDEN")) return fail("FORBIDDEN");
    if (error.message.includes("STALE_JWT")) return fail("DEPENDENCY_FAILED");
    return fail("INTERNAL");
  }

  for (const path of HR_ROUTER_PATHS) revalidatePath(path, "page");
  for (const path of ATTENDANCE_ROUTER_PATHS) revalidatePath(path, "page");

  after(async () => {
    const log = loggerWith({
      feature: "hr",
      event: "reject_clarification",
      user_id: user.id,
    });
    log.info({ exception_id: parsed.data.exceptionId }, "rejectClarificationAction completed");
  });

  return ok({ exceptionId: parsed.data.exceptionId });
}
