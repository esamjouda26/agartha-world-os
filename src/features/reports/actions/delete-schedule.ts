"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { REPORTS_ROUTER_PATHS } from "@/features/reports/cache-tags";
import { deleteScheduleSchema } from "@/features/reports/schemas/report";

const limiter = createRateLimiter({
  tokens: 20,
  window: "1 m",
  prefix: "reports-delete-schedule",
});

/**
 * Delete a saved report config. Single-statement DELETE; CASCADE
 * removes any associated `report_executions`. `reports_delete` RLS
 * gates on `reports:d`.
 */
export async function deleteScheduleAction(
  input: unknown,
): Promise<ServerActionResult<Readonly<{ id: string }>>> {
  const parsed = deleteScheduleSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, readonly string[]> };
  const reportsAccess = appMeta.domains?.reports ?? [];
  const hasWriteGrant = reportsAccess.includes("d");
  const hasOwnRowPath = reportsAccess.includes("r");
  if (!hasWriteGrant && !hasOwnRowPath) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error, count } = await supabase
    .from("reports")
    .delete({ count: "exact" })
    .eq("id", parsed.data.id)
    .eq("created_by", user.id);
  if (error) return fail("INTERNAL");
  if ((count ?? 0) === 0) return fail("NOT_FOUND");

  for (const path of REPORTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "reports",
      event: "delete_schedule",
      user_id: user.id,
    });
    log.info({ report_id: parsed.data.id }, "deleteScheduleAction completed");
  });

  return ok({ id: parsed.data.id });
}
