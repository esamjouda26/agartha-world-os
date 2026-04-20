"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath, updateTag } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CLARIFICATION_RATE_LIMIT_TOKENS,
  CLARIFICATION_RATE_LIMIT_WINDOW,
  TAG_HR_EXCEPTIONS,
} from "@/features/attendance/constants";
import { addClarificationSchema } from "@/features/attendance/schemas/clock";
import { mapClockRpcError } from "@/features/attendance/actions/_shared";

const limiter = createRateLimiter({
  tokens: CLARIFICATION_RATE_LIMIT_TOKENS,
  window: CLARIFICATION_RATE_LIMIT_WINDOW,
  prefix: "attendance-clarification",
});

/**
 * Calls `rpc_add_exception_clarification(p_exception_id, p_text)` at
 * [init_schema.sql:5985](supabase/migrations/20260417064731_init_schema.sql#L5985).
 * The RPC itself enforces ownership (rejects `FORBIDDEN: not your exception`)
 * so the server action is mostly the pipeline shell.
 */
export async function addClarificationAction(
  input: unknown,
): Promise<ServerActionResult<{ exceptionId: string }>> {
  const parsed = addClarificationSchema.safeParse(input);
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

  const { error } = await supabase.rpc("rpc_add_exception_clarification", {
    p_exception_id: parsed.data.exceptionId,
    p_text: parsed.data.text,
  });

  if (error) {
    const mapped = mapClockRpcError(error.message);
    return fail(mapped.code);
  }

  updateTag(TAG_HR_EXCEPTIONS);
  // See comment in clock-in.ts — matching revalidatePath so the sheet
  // reflects the submitted clarification in the row's "note" column.
  revalidatePath("/", "layout");

  after(async () => {
    const log = loggerWith({
      feature: "attendance",
      event: "add_clarification",
      user_id: user.id,
    });
    log.info({ exception_id: parsed.data.exceptionId }, "addClarificationAction completed");
  });

  return ok({ exceptionId: parsed.data.exceptionId });
}
