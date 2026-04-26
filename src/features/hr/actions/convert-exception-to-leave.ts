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
import { convertExceptionToLeaveSchema } from "@/features/hr/schemas/attendance-management";

const limiter = createRateLimiter({
  tokens: 10,
  window: "1 m",
  prefix: "hr-convert-exception-leave",
});

/**
 * HR-only. Convert an attendance exception (absent / missing_clock_in)
 * into an approved leave request with automatic ledger debit.
 *
 * Wraps `rpc_convert_exception_to_leave`. Accepts both `unjustified`
 * and `pending_review` source statuses per ADR-0007.
 *
 * Consumers: `/management/hr/attendance/queue` + ledger row action
 */
export async function convertExceptionToLeaveAction(
  input: unknown,
): Promise<ServerActionResult<{ exceptionId: string }>> {
  const parsed = convertExceptionToLeaveSchema.safeParse(input);
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

  const { error } = await supabase.rpc("rpc_convert_exception_to_leave", {
    p_exception_id: parsed.data.exceptionId,
    p_leave_type_id: parsed.data.leaveTypeId,
    p_days: parsed.data.days,
    p_note: parsed.data.note,
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
      event: "convert_exception_to_leave",
      user_id: user.id,
    });
    log.info(
      { exception_id: parsed.data.exceptionId, leave_type_id: parsed.data.leaveTypeId },
      "convertExceptionToLeaveAction completed",
    );
  });

  return ok({ exceptionId: parsed.data.exceptionId });
}
