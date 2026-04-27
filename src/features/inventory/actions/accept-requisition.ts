"use server";

import "server-only";

import { z } from "zod";
import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INVENTORY_ROUTER_PATHS } from "@/features/inventory/cache-tags";
import {
  ACCEPT_REQUISITION_RATE_TOKENS,
  ACCEPT_REQUISITION_RATE_WINDOW,
} from "@/features/inventory/constants";

const acceptRequisitionSchema = z.object({
  requisition_id: z.string().min(1, "Requisition ID is required"),
});

export type AcceptRequisitionResult = Readonly<{
  requisitionId: string;
}>;

const limiter = createRateLimiter({
  tokens: ACCEPT_REQUISITION_RATE_TOKENS,
  window: ACCEPT_REQUISITION_RATE_WINDOW,
  prefix: "inventory-accept-requisition",
});

/**
 * Claims a pending material requisition for the calling user, transitioning
 * it from 'pending' → 'in_progress' with the user's ID in `assigned_to`.
 *
 * Only requisitions in 'pending' status can be accepted — the WHERE clause
 * enforces this so concurrent accepts are idempotent (the second caller gets
 * a NOT_FOUND result because the row is no longer 'pending').
 */
export async function acceptRequisitionAction(
  input: unknown,
): Promise<ServerActionResult<AcceptRequisitionResult>> {
  // Step 1: Validate input
  const parsed = acceptRequisitionSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // Step 2: AuthN + RBAC
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.["inventory_ops"]?.includes("u")) return fail("FORBIDDEN");

  // Step 3: Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Step 4: Update — WHERE status='pending' ensures atomic claim
  const { data: updated, error: updateError } = await supabase
    .from("material_requisitions")
    .update({ status: "in_progress", assigned_to: user.id })
    .eq("id", parsed.data.requisition_id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (updateError) return fail("INTERNAL");
  if (!updated) return fail("NOT_FOUND");

  // Step 5: Invalidate router cache
  for (const path of INVENTORY_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "accept_requisition",
      user_id: user.id,
    });
    log.info({ requisitionId: updated.id }, "acceptRequisitionAction completed");
  });

  return ok({ requisitionId: updated.id });
}
