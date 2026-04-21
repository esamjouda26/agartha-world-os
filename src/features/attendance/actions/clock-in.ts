"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ATTENDANCE_ROUTER_PATHS } from "@/features/attendance/cache-tags";
import { CLOCK_RATE_LIMIT_TOKENS, CLOCK_RATE_LIMIT_WINDOW } from "@/features/attendance/constants";
import { clockMutationSchema } from "@/features/attendance/schemas/clock";
import { mapClockRpcError } from "@/features/attendance/utils/error-mapping";

export type ClockInResult = Readonly<{
  punchId: string;
  clockInAt: string;
  expectedStartTime: string | null;
}>;

const limiter = createRateLimiter({
  tokens: CLOCK_RATE_LIMIT_TOKENS,
  window: CLOCK_RATE_LIMIT_WINDOW,
  prefix: "attendance-clock-in",
});

/**
 * Clock-in Server Action — 8-step pipeline per prompt.md.
 * Calls `rpc_clock_in(p_gps, p_selfie_url, p_remark, p_source='mobile')`
 * (grep-verified at [init_schema.sql:5926](supabase/migrations/20260417064731_init_schema.sql#L5926)).
 *
 * Precedence drift: frontend_spec.md:4230 mentions `revalidatePath` here.
 * prompt.md Absolute Rule #4 overrides that. Per
 * `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts`
 * (Next 16.2.4), `revalidateTag(tag, profile)` purges cached data and
 * requires a cache-life profile; `updateTag(tag)` is the Server-Action
 * primitive with read-your-own-writes semantics — we use it here for
 * exactly that reason. Tags are `hr:attendance` + `hr:exceptions` per
 * frontend_spec.md §2 taxonomy.
 */
export async function clockInAction(input: unknown): Promise<ServerActionResult<ClockInResult>> {
  // 1. Zod parse
  const parsed = clockMutationSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes("c")) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Execute + 5. Shape result
  const { data, error } = await supabase.rpc("rpc_clock_in", {
    p_gps: parsed.data.gps,
    p_selfie_url: parsed.data.selfieUrl,
    p_source: "mobile",
    ...(parsed.data.remark !== null ? { p_remark: parsed.data.remark } : {}),
  });

  if (error) {
    const mapped = mapClockRpcError(error.message);
    return fail(mapped.code);
  }

  const payload = data as {
    punch_id?: string;
    clock_in?: string;
    expected_start_time?: string | null;
  } | null;

  if (!payload?.punch_id || !payload.clock_in) return fail("INTERNAL");

  const resultData: ClockInResult = {
    punchId: payload.punch_id,
    clockInAt: payload.clock_in,
    expectedStartTime: payload.expected_start_time ?? null,
  };

  // 7. Invalidate cache — surgical Router Cache bust per ADR-0006.
  // RLS-scoped queries can't live in Next's Data Cache (unstable_cache's
  // work fn is detached from request context — no `cookies()`, which
  // would force a service-role client that bypasses RLS). The RSC payload
  // layer is what we bust so next navigation reruns the React-`cache()`
  // fetchers with fresh rows.
  for (const path of ATTENDANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "attendance",
      event: "clock_in",
      user_id: user.id,
    });
    log.info({ success: true }, "clockInAction completed");
  });

  return ok(resultData);
}
