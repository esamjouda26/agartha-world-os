"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROCUREMENT_ROUTER_PATHS } from "@/features/procurement/cache-tags";
import {
  PO_CRUD_RATE_TOKENS,
  PO_CRUD_RATE_WINDOW,
} from "@/features/procurement/constants";
import {
  bulkMarkPoSentSchema,
} from "@/features/procurement/schemas/purchase-order";

const limiter = createRateLimiter({
  tokens: PO_CRUD_RATE_TOKENS,
  window: PO_CRUD_RATE_WINDOW,
  prefix: "procurement-bulk-mark-sent",
});

/**
 * Bulk mark draft POs as sent — 8-step enterprise pipeline.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/purchase-orders` INTERACTIONS.
 *   "Bulk 'Mark as Sent': select multiple draft POs → bulk action button
 *    → Server Action → batch UPDATE status = 'sent' → revalidatePath"
 * RBAC: procurement:u.
 */
export async function bulkMarkPoSent(
  input: unknown,
): Promise<ServerActionResult<{ count: number }>> {
  // 1. Zod parse
  const parsed = bulkMarkPoSentSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires procurement:u
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.procurement?.includes("u")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Execute mutation — batch UPDATE only draft POs
  const d = parsed.data;
  const { data: updated, error } = await supabase
    .from("purchase_orders")
    .update({ status: "sent", updated_by: user.id, updated_at: new Date().toISOString() })
    .in("id", d.poIds)
    .eq("status", "draft")
    .select("id");

  if (error) {
    const log = loggerWith({
      feature: "procurement",
      event: "bulk-mark-sent",
      user_id: user.id,
    });
    log.error({ error: error.message }, "bulk mark sent failed");
    return fail("INTERNAL");
  }

  const count = updated?.length ?? 0;

  // 5. Invalidate cache
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "procurement",
      event: "bulk-mark-sent",
      user_id: user.id,
    });
    log.info({ po_ids: d.poIds, updated_count: count }, "bulkMarkPoSent completed");
  });

  return ok({ count });
}
