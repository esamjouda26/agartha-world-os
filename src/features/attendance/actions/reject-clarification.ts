"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ATTENDANCE_ROUTER_PATHS } from "@/features/attendance/cache-tags";
import {
  CLARIFICATION_RATE_LIMIT_TOKENS,
  CLARIFICATION_RATE_LIMIT_WINDOW,
} from "@/features/attendance/constants";
import { rejectClarificationSchema } from "@/features/attendance/schemas/clock";
import { mapClockRpcError } from "@/features/attendance/utils/error-mapping";

const limiter = createRateLimiter({
  tokens: CLARIFICATION_RATE_LIMIT_TOKENS,
  window: CLARIFICATION_RATE_LIMIT_WINDOW,
  prefix: "attendance-clarification-reject",
});

/**
 * HR-only. Reject a pending clarification with a reason stored in
 * `hr_note`. Staff may resubmit via `submitClarificationAction`, which
 * flips the row back to `pending_review`.
 *
 * Wraps `rpc_reject_exception_clarification`. Intended consumer:
 * `/management/hr/attendance/queue` row action (Phase 7).
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
    const mapped = mapClockRpcError(error.message);
    return fail(mapped.code);
  }

  for (const path of ATTENDANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "attendance",
      event: "reject_clarification",
      user_id: user.id,
    });
    log.info({ exception_id: parsed.data.exceptionId }, "rejectClarificationAction completed");
  });

  return ok({ exceptionId: parsed.data.exceptionId });
}
