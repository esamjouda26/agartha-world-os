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
import { submitClarificationSchema } from "@/features/attendance/schemas/clock";
import { mapClockRpcError } from "@/features/attendance/utils/error-mapping";

const limiter = createRateLimiter({
  tokens: CLARIFICATION_RATE_LIMIT_TOKENS,
  window: CLARIFICATION_RATE_LIMIT_WINDOW,
  prefix: "attendance-clarification-submit",
});

/**
 * Submit or resubmit a clarification on an own attendance exception.
 *
 * Calls `rpc_submit_exception_clarification(p_exception_id, p_text,
 * p_attachment_paths)` introduced by
 * [20260422120000_attendance_clarification_workflow.sql](../../../../supabase/migrations/20260422120000_attendance_clarification_workflow.sql).
 *
 * Per ADR-0007 the RPC atomically: writes `staff_clarification`,
 * transitions `status` → `pending_review`, stamps
 * `clarification_submitted_at`, clears any prior rejection fields, and
 * links previously-uploaded attachment blobs (idempotent on duplicate
 * paths). Ownership is enforced by the RPC; this action is the pipeline
 * shell (validation + rate-limit + cache invalidation + log).
 */
export async function submitClarificationAction(
  input: unknown,
): Promise<ServerActionResult<{ exceptionId: string; attachmentCount: number }>> {
  const parsed = submitClarificationSchema.safeParse(input);
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
  if (!hrAccess.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data, error } = await supabase.rpc("rpc_submit_exception_clarification", {
    p_exception_id: parsed.data.exceptionId,
    p_text: parsed.data.text,
    p_attachment_paths: parsed.data.attachmentPaths,
  });

  if (error) {
    const mapped = mapClockRpcError(error.message);
    return fail(mapped.code);
  }

  // Router Cache invalidation per ADR-0006.
  for (const path of ATTENDANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "attendance",
      event: "submit_clarification",
      user_id: user.id,
    });
    log.info(
      {
        exception_id: parsed.data.exceptionId,
        attachment_count: parsed.data.attachmentPaths.length,
      },
      "submitClarificationAction completed",
    );
  });

  const payload = data as { attachment_count?: number } | null;
  return ok({
    exceptionId: parsed.data.exceptionId,
    attachmentCount: payload?.attachment_count ?? parsed.data.attachmentPaths.length,
  });
}
