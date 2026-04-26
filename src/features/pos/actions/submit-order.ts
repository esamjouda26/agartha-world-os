"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import type { Json } from "@/types/database";
import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POS_ROUTER_PATHS } from "@/features/pos/cache-tags";
import {
  SUBMIT_ORDER_RATE_LIMIT_TOKENS,
  SUBMIT_ORDER_RATE_LIMIT_WINDOW,
} from "@/features/pos/constants";
import { submitOrderSchema } from "@/features/pos/schemas/submit-order";

export type SubmitOrderResult = Readonly<{ orderId: string }>;

const limiter = createRateLimiter({
  tokens: SUBMIT_ORDER_RATE_LIMIT_TOKENS,
  window: SUBMIT_ORDER_RATE_LIMIT_WINDOW,
  prefix: "pos-submit-order",
});

/**
 * Submit POS order — 8-step Server Action pipeline (prompt.md).
 * Calls submit_pos_order(p_pos_point_id, p_items, p_payment_method).
 * RPC grep: init_schema.sql:5806
 *
 * Server-side price lookup in the RPC prevents client-side price tampering.
 * No idempotency key required here — duplicate order submissions are acceptable
 * (crew can re-ring a separate order if the first one fails or is lost).
 */
export async function submitOrderAction(
  input: unknown,
): Promise<ServerActionResult<SubmitOrderResult>> {
  // 1. Zod parse
  const parsed = submitOrderSchema.safeParse(input);
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
  if (!appMeta.domains?.pos?.includes("c")) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 5. Execute via typed RPC. Items serialised to Json for the JSONB parameter.
  const { data: orderId, error } = await supabase.rpc("submit_pos_order", {
    p_pos_point_id: parsed.data.posPointId,
    p_items: parsed.data.items as unknown as Json,
    p_payment_method: parsed.data.paymentMethod,
  });

  if (error) {
    if (error.message.includes("MATERIAL_NOT_FOUND_OR_INACTIVE")) return fail("NOT_FOUND");
    if (error.message.includes("POS_POINT_NOT_FOUND")) return fail("NOT_FOUND");
    if (error.message.includes("Forbidden")) return fail("FORBIDDEN");
    return fail("INTERNAL");
  }
  if (!orderId) return fail("INTERNAL");

  // 7. Cache invalidation (ADR-0006)
  for (const path of POS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  // 8. Structured log (non-blocking)
  after(async () => {
    const log = loggerWith({ feature: "pos", event: "submit_order", user_id: user.id });
    log.info({ orderId, posPointId: parsed.data.posPointId }, "submitOrderAction completed");
  });

  return ok({ orderId: orderId as string });
}
