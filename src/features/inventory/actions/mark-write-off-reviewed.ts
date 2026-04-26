"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INVENTORY_ROUTER_PATHS } from "@/features/inventory/cache-tags";
import {
  MARK_WRITE_OFF_REVIEWED_RATE_TOKENS,
  MARK_WRITE_OFF_REVIEWED_RATE_WINDOW,
} from "@/features/inventory/constants";
import { markWriteOffReviewedSchema } from "@/features/inventory/schemas/mark-write-off-reviewed";

const limiter = createRateLimiter({
  tokens: MARK_WRITE_OFF_REVIEWED_RATE_TOKENS,
  window: MARK_WRITE_OFF_REVIEWED_RATE_WINDOW,
  prefix: "inventory-mark-write-off-reviewed",
});

/**
 * Mark a `write_offs` row as reviewed. Spec: frontend_spec.md:2206.
 *
 * Action gates `inventory_ops:u OR pos:u` (mirrors RLS UPDATE policy
 * on the write_offs table — both domains can mark reviewed).
 *
 * `WHERE reviewed_at IS NULL` guard is the unreviewed→reviewed
 * transition lock — if a concurrent reviewer beat us to it, the
 * UPDATE is a no-op and the action returns CONFLICT instead of
 * silently overwriting.
 */
export async function markWriteOffReviewed(
  input: unknown,
): Promise<ServerActionResult<{ writeOffId: string }>> {
  // 1. Zod parse
  const parsed = markWriteOffReviewedSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION_FAILED", {
      writeOffId: parsed.error.issues[0]?.message ?? "Invalid id",
    });
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — inventory_ops:u OR pos:u
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const inventoryOpsU =
    appMeta.domains?.inventory_ops?.includes("u") ?? false;
  const posU = appMeta.domains?.pos?.includes("u") ?? false;
  if (!inventoryOpsU && !posU) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. UPDATE — open-states guard via `reviewed_at IS NULL`. The .is()
  //    filter generates the correct `reviewed_at=is.null` PostgREST
  //    predicate.
  const { data: updated, error } = await supabase
    .from("write_offs")
    .update({
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", parsed.data.writeOffId)
    .is("reviewed_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const log = loggerWith({
      feature: "inventory",
      event: "mark_write_off_reviewed",
      user_id: user.id,
    });
    log.error(
      { code: error.code, message: error.message },
      "mark-reviewed UPDATE failed",
    );
    return fail("INTERNAL");
  }
  if (!updated) {
    return fail("CONFLICT", {
      form: "Write-off has already been reviewed.",
    });
  }

  // 5. Invalidate cache (ADR-0006)
  for (const p of INVENTORY_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "mark_write_off_reviewed",
      user_id: user.id,
    });
    log.info(
      { write_off_id: parsed.data.writeOffId },
      "markWriteOffReviewed completed",
    );
  });

  return ok({ writeOffId: parsed.data.writeOffId });
}
