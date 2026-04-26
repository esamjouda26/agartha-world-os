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
import { justifyExceptionSchema } from "@/features/hr/schemas/attendance-management";

const limiter = createRateLimiter({
  tokens: 10,
  window: "1 m",
  prefix: "hr-exception-justify",
});

/**
 * HR-only. Approve an attendance exception — from `unjustified`
 * (unilateral, invoked from the ledger — e.g. system-outage day) or
 * from `pending_review` (invoked from the queue in response to a
 * staff submission). `hr_note` stores the justification.
 *
 * Wraps `rpc_justify_exception`. Consumers:
 * `/management/hr/attendance/queue` + `/management/hr/attendance/ledger`
 */
export async function justifyExceptionAction(
  input: unknown,
): Promise<ServerActionResult<{ exceptionId: string }>> {
  const parsed = justifyExceptionSchema.safeParse(input);
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

  const { error } = await supabase.rpc("rpc_justify_exception", {
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
      event: "justify_exception",
      user_id: user.id,
    });
    log.info({ exception_id: parsed.data.exceptionId }, "justifyExceptionAction completed");
  });

  return ok({ exceptionId: parsed.data.exceptionId });
}
