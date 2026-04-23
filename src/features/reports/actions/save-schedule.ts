"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import { REPORTS_ROUTER_PATHS } from "@/features/reports/cache-tags";
import { saveScheduleSchema } from "@/features/reports/schemas/report";

export type SaveScheduleResult = Readonly<{ id: string }>;

const limiter = createRateLimiter({
  tokens: 30,
  window: "1 m",
  prefix: "reports-save-schedule",
});

/**
 * Save a scheduled report config — INSERT if `id` is null, UPDATE
 * otherwise. Both paths are single-statement single-table mutations
 * (CLAUDE.md §4 only demands a transactional RPC when mutations cross
 * tables). The `reports_insert` / `reports_update` RLS policies gate
 * on `reports:c` / `reports:u` respectively — we mirror the same
 * check here for a clean FORBIDDEN instead of a silent zero-row write.
 */
export async function saveScheduleAction(
  input: unknown,
): Promise<ServerActionResult<SaveScheduleResult>> {
  const parsed = saveScheduleSchema.safeParse(input);
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
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, readonly string[]> };
  const reportsAccess = appMeta.domains?.reports ?? [];
  const isEdit = parsed.data.id !== null;
  const needed = isEdit ? "u" : "c";

  const hasWriteGrant = reportsAccess.includes(needed);
  const hasOwnRowPath = reportsAccess.includes("r");
  if (!hasWriteGrant && !hasOwnRowPath) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const payload = {
    report_type: parsed.data.reportType,
    parameters: parsed.data.parameters as unknown as Json,
    schedule_cron: parsed.data.scheduleCron,
    recipients: parsed.data.recipients as unknown as Json,
    is_active: parsed.data.isActive,
  };

  let id: string;
  if (isEdit && parsed.data.id) {
    const { error } = await supabase
      .from("reports")
      .update({ ...payload, updated_by: user.id })
      .eq("id", parsed.data.id)
      .eq("created_by", user.id); // Own-rows only — defence in depth on top of RLS.
    if (error) return fail("INTERNAL");
    id = parsed.data.id;
  } else {
    const { data, error } = await supabase
      .from("reports")
      .insert({ ...payload, created_by: user.id, updated_by: user.id })
      .select("id")
      .single();
    if (error || !data) return fail("INTERNAL");
    id = data.id;
  }

  for (const path of REPORTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "reports",
      event: isEdit ? "schedule_update" : "schedule_create",
      user_id: user.id,
    });
    log.info(
      { report_id: id, report_type: parsed.data.reportType },
      "saveScheduleAction completed",
    );
  });

  return ok({ id });
}
