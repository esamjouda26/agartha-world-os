"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ATTENDANCE_ROUTER_PATHS } from "@/features/attendance/cache-tags";
import { CLOCK_RATE_LIMIT_TOKENS, CLOCK_RATE_LIMIT_WINDOW } from "@/features/attendance/constants";
import { mapClockRpcError } from "@/features/attendance/utils/error-mapping";

/**
 * Void-own-punch Server Action — wraps `rpc_void_own_punch` (migration
 * [20260420052116_add_rpc_void_own_punch.sql](supabase/migrations/20260420052116_add_rpc_void_own_punch.sql)).
 *
 * The RPC enforces every constraint server-side: ownership, 5-minute
 * grace window, not-already-voided, claims freshness. Our job here is
 * rate-limit + map the RPC's RAISE messages into the ErrorCode taxonomy
 * + invalidate the route cache so the panel re-renders with the voided
 * punch removed.
 *
 * NOTE: the generated DB types (src/types/database.ts) do not yet include
 * `rpc_void_own_punch` — run `pnpm db:types` after `supabase db push` to
 * pick it up. Until then the typed cast below is the minimum-surface
 * workaround (not `any`, not `@ts-ignore`). Replace with a direct
 * `supabase.rpc(...)` call once types regenerate.
 */

const voidPunchSchema = z.object({
  // `z.guid()` not `z.string().uuid()` — Zod 4's strict UUID matcher
  // rejects hand-crafted seed IDs (version nibble 0). Postgres's UUID
  // column is the authoritative format check.
  punchId: z.guid(),
});

type VoidRpcResult = { error: { message: string } | null };

const limiter = createRateLimiter({
  tokens: CLOCK_RATE_LIMIT_TOKENS,
  window: CLOCK_RATE_LIMIT_WINDOW,
  prefix: "attendance-void-punch",
});

export async function voidOwnPunchAction(
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
  if (!hrAccess.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // See file header: generated types don't include this RPC yet. Cast
  // narrows `supabase.rpc`'s signature to just the shape we need —
  // scoped, not-`any`, explicit about what's being asserted.
  const typedRpc = supabase.rpc.bind(supabase) as unknown as (
    name: "rpc_void_own_punch",
    args: { p_punch_id: string },
  ) => Promise<VoidRpcResult>;
  const { error } = await typedRpc("rpc_void_own_punch", { p_punch_id: parsed.data.punchId });

  if (error) {
    const mapped = mapClockRpcError(error.message);
    return fail(mapped.code);
  }

  // Router Cache invalidation per ADR-0006 — see clock-in.ts.
  for (const path of ATTENDANCE_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "attendance",
      event: "void_own_punch",
      user_id: user.id,
    });
    log.info({ punch_id: parsed.data.punchId }, "voidOwnPunchAction completed");
  });

  return ok({ punchId: parsed.data.punchId });
}
