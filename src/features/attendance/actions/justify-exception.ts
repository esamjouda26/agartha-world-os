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
import { justifyExceptionSchema } from "@/features/attendance/schemas/clock";
import { mapClockRpcError } from "@/features/attendance/utils/error-mapping";

const limiter = createRateLimiter({
  tokens: CLARIFICATION_RATE_LIMIT_TOKENS,
  window: CLARIFICATION_RATE_LIMIT_WINDOW,
  prefix: "attendance-exception-justify",
});

/**
 * HR-only. Approve an attendance exception — from `unjustified`
 * (unilateral, invoked from the ledger — e.g. system-outage day) or
 * from `pending_review` (invoked from the queue in response to a
 * staff submission). `hr_note` stores the justification.
 *
 * Wraps `rpc_justify_exception`. Intended consumers:
 * `/management/hr/attendance/queue` + `/management/hr/attendance/ledger`
 * row actions (Phase 7).
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
    const mapped = mapClockRpcError(error.message);
    return fail(mapped.code);
  }

  for (const path of ATTENDANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "attendance",
      event: "justify_exception",
      user_id: user.id,
    });
    log.info({ exception_id: parsed.data.exceptionId }, "justifyExceptionAction completed");
  });

  return ok({ exceptionId: parsed.data.exceptionId });
}
