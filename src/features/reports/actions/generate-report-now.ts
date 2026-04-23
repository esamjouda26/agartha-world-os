"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { REPORTS_ROUTER_PATHS } from "@/features/reports/cache-tags";
import { generateReportSchema } from "@/features/reports/schemas/report";

export type GenerateReportNowResult = Readonly<{
  reportId: string | null;
  executionId: string | null;
  rowCount: number | null;
  fileUrl: string | null;
}>;

const limiter = createRateLimiter({
  tokens: 10,
  window: "1 m",
  prefix: "reports-generate-now",
});

/**
 * One-off "generate now" flow.
 *
 * Per spec §6 line 4226, **Generate requires only `reports:r`** — not
 * `reports:c`. The INSERT into `reports` that the flow needs is done by
 * the `generate-report` Edge Function under its service-role client
 * ([generate-report/index.ts:135-151](../../../../supabase/functions/generate-report/index.ts#L135)),
 * which bypasses `reports_insert`'s `reports:c` gate for this read-only
 * caller. We invoke inline with `{ report_type, parameters }` so the
 * Edge Function creates both the config row and the execution row.
 *
 * Pipeline:
 *   1. Zod parse.
 *   2. Verify `reports:r` — matches spec's domain-gating requirement.
 *   3. Rate-limit (generating is expensive — CSV + Storage upload).
 *   4. Invoke `generate-report` Edge Function with inline config.
 *   5. Surface Edge Function errors as DEPENDENCY_FAILED.
 *   6. `revalidatePath` every reports surface.
 */
export async function generateReportNowAction(
  input: unknown,
): Promise<ServerActionResult<GenerateReportNowResult>> {
  const parsed = generateReportSchema.safeParse(input);
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
  if (!(appMeta.domains?.reports ?? []).includes("r")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Inline invocation — the Edge Function creates the `reports` row
  // (service-role, bypasses RLS) AND the `report_executions` row AND
  // runs `execute_report` + CSV + Storage upload.
  const { data: fnData, error: fnErr } = await supabase.functions.invoke<{
    ok?: boolean;
    report_id?: string;
    execution_id?: string;
    row_count?: number;
    file_url?: string;
    error?: string;
  }>("generate-report", {
    body: {
      report_type: parsed.data.reportType,
      parameters: parsed.data.parameters,
    },
  });
  if (fnErr || fnData?.error) return fail("DEPENDENCY_FAILED");

  for (const path of REPORTS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "reports",
      event: "generate_now",
      user_id: user.id,
    });
    log.info(
      {
        report_id: fnData?.report_id,
        report_type: parsed.data.reportType,
        row_count: fnData?.row_count,
      },
      "generateReportNowAction completed",
    );
  });

  return ok({
    reportId: fnData?.report_id ?? null,
    executionId: fnData?.execution_id ?? null,
    rowCount: fnData?.row_count ?? null,
    fileUrl: fnData?.file_url ?? null,
  });
}
