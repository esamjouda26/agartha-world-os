"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { REPORTS_ROUTER_PATHS } from "@/features/reports/cache-tags";
import { toggleScheduleActiveSchema } from "@/features/reports/schemas/report";

const limiter = createRateLimiter({
  tokens: 30,
  window: "1 m",
  prefix: "reports-toggle-active",
});

/**
 * Pause / resume a scheduled report. Single-statement UPDATE of
 * `reports.is_active` — `reports_update` RLS gates on `reports:u`.
 */
export async function toggleScheduleActiveAction(
  input: unknown,
): Promise<ServerActionResult<Readonly<{ id: string; isActive: boolean }>>> {
  const parsed = toggleScheduleActiveSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, readonly string[]> };
  const reportsAccess = appMeta.domains?.reports ?? [];
  const hasWriteGrant = reportsAccess.includes("u");
  const hasOwnRowPath = reportsAccess.includes("r");
  if (!hasWriteGrant && !hasOwnRowPath) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("reports")
    .update({ is_active: parsed.data.isActive, updated_by: user.id })
    .eq("id", parsed.data.id)
    .eq("created_by", user.id);
  if (error) return fail("INTERNAL");

  for (const path of REPORTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "reports",
      event: "toggle_active",
      user_id: user.id,
    });
    log.info(
      { report_id: parsed.data.id, is_active: parsed.data.isActive },
      "toggleScheduleActiveAction completed",
    );
  });

  return ok({ id: parsed.data.id, isActive: parsed.data.isActive });
}
