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
import { voidPunchSchema } from "@/features/hr/schemas/attendance-management";

const limiter = createRateLimiter({
  tokens: 10,
  window: "1 m",
  prefix: "hr-void-punch",
});

/**
 * HR-only. Void any punch — UPDATE `timecard_punches` SET
 * `voided_at = NOW()`, `voided_by = auth.uid()`.
 *
 * This is the management action (requires hr:u). NOT the same as
 * crew `rpc_void_own_punch` which lets staff void their own punch
 * within a grace window.
 *
 * Partial unique index releases the slot after voiding, so a new
 * correcting punch can be inserted.
 *
 * Consumer: `/management/hr/attendance/ledger` row action
 */
export async function voidPunchAction(
  input: unknown,
): Promise<ServerActionResult<{ punchId: string }>> {
  const parsed = voidPunchSchema.safeParse(input);
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

  const { error } = await supabase
    .from("timecard_punches")
    .update({ voided_at: new Date().toISOString(), voided_by: user.id })
    .eq("id", parsed.data.punchId)
    .is("voided_at", null);

  if (error) {
    if (error.message.includes("NOT_FOUND")) return fail("NOT_FOUND");
    return fail("INTERNAL");
  }

  for (const path of HR_ROUTER_PATHS) revalidatePath(path, "page");
  for (const path of ATTENDANCE_ROUTER_PATHS) revalidatePath(path, "page");

  after(async () => {
    const log = loggerWith({
      feature: "hr",
      event: "void_punch",
      user_id: user.id,
    });
    log.info({ punch_id: parsed.data.punchId }, "voidPunchAction completed");
  });

  return ok({ punchId: parsed.data.punchId });
}
