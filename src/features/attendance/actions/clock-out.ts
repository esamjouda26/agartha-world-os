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

export type ClockOutResult = Readonly<{
  punchId: string;
  clockOutAt: string;
  clockInAt: string | null;
}>;

const limiter = createRateLimiter({
  tokens: CLOCK_RATE_LIMIT_TOKENS,
  window: CLOCK_RATE_LIMIT_WINDOW,
  prefix: "attendance-clock-out",
});

/**
 * Clock-out Server Action. Calls `rpc_clock_out` at
 * [init_schema.sql:5947](supabase/migrations/20260417064731_init_schema.sql#L5947).
 * WF-5 explicitly allows standalone clock-out (no prior clock-in required).
 */
export async function clockOutAction(input: unknown): Promise<ServerActionResult<ClockOutResult>> {
  const parsed = clockMutationSchema.safeParse(input);
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

  const { data, error } = await supabase.rpc("rpc_clock_out", {
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
    clock_in?: string | null;
    clock_out?: string;
  } | null;

  if (!payload?.punch_id || !payload.clock_out) return fail("INTERNAL");

  const resultData: ClockOutResult = {
    punchId: payload.punch_id,
    clockOutAt: payload.clock_out,
    clockInAt: payload.clock_in ?? null,
  };

  // Router Cache invalidation (ADR-0006): surgical `revalidatePath` per
  // known attendance-reading route. RLS-scoped queries can't go in the
  // Data Cache; the RSC payload layer is what we bust so the next
  // navigation reruns the React-`cache()` fetchers with fresh rows.
  for (const path of ATTENDANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "attendance",
      event: "clock_out",
      user_id: user.id,
    });
    log.info({ success: true }, "clockOutAction completed");
  });

  return ok(resultData);
}
