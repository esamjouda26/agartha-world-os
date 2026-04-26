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
  RECONCILIATION_REVIEW_RATE_TOKENS,
  RECONCILIATION_REVIEW_RATE_WINDOW,
} from "@/features/inventory/constants";
import { approveReconciliationSchema } from "@/features/inventory/schemas/approve-reconciliation";

const limiter = createRateLimiter({
  tokens: RECONCILIATION_REVIEW_RATE_TOKENS,
  window: RECONCILIATION_REVIEW_RATE_WINDOW,
  prefix: "inventory-approve-reconciliation",
});

/**
 * Approve a reconciliation (WF-11 final manager step). Computes
 * `discrepancy_found` server-side from current items so the client
 * cannot misreport it, then UPDATEs status='completed'.
 *
 * The DB trigger `trg_reconciliation_approval_goods_movement`
 * (init_schema.sql:5259) fires AFTER UPDATE and inserts goods_movements
 * (type 701/702) per item with non-zero variance. No application-level
 * goods_movements INSERT — we just flip the row.
 *
 * Open-states guard: `.eq("status", "pending_review")` makes the UPDATE
 * a no-op when the reconciliation has already moved on (concurrent
 * approval, or someone reverted it). Result becomes null → CONFLICT.
 *
 * Action gate `inventory_ops:u` mirrors RLS UPDATE policy.
 */
export async function approveReconciliation(
  input: unknown,
): Promise<
  ServerActionResult<{ reconciliationId: string; discrepancyFound: boolean }>
> {
  // 1. Zod parse
  const parsed = approveReconciliationSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION_FAILED", {
      reconciliationId: parsed.error.issues[0]?.message ?? "Invalid id",
    });
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.inventory_ops?.includes("u")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Read items to compute discrepancy_found authoritatively.
  const { data: items, error: itemsErr } = await supabase
    .from("inventory_reconciliation_items")
    .select("system_qty, physical_qty")
    .eq("reconciliation_id", parsed.data.reconciliationId);
  if (itemsErr) {
    const log = loggerWith({
      feature: "inventory",
      event: "approve_reconciliation",
      user_id: user.id,
    });
    log.error(
      { code: itemsErr.code, message: itemsErr.message },
      "items read failed",
    );
    return fail("INTERNAL");
  }
  const discrepancyFound = (items ?? []).some(
    (i) => Number(i.physical_qty ?? 0) !== Number(i.system_qty ?? 0),
  );

  // 5. UPDATE — only when status is still pending_review. Trigger
  //    trg_reconciliation_approval_goods_movement fires automatically.
  const { data: updated, error: updErr } = await supabase
    .from("inventory_reconciliations")
    .update({
      status: "completed",
      discrepancy_found: discrepancyFound,
      updated_by: user.id,
    })
    .eq("id", parsed.data.reconciliationId)
    .eq("status", "pending_review")
    .select("id")
    .maybeSingle();
  if (updErr) {
    const log = loggerWith({
      feature: "inventory",
      event: "approve_reconciliation",
      user_id: user.id,
    });
    log.error(
      { code: updErr.code, message: updErr.message },
      "approval UPDATE failed",
    );
    return fail("INTERNAL");
  }
  if (!updated) {
    return fail("CONFLICT", {
      form: "Reconciliation is no longer awaiting review.",
    });
  }

  // 6. Invalidate cache (ADR-0006)
  for (const p of INVENTORY_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "approve_reconciliation",
      user_id: user.id,
    });
    log.info(
      {
        reconciliation_id: parsed.data.reconciliationId,
        discrepancy_found: discrepancyFound,
        item_count: items?.length ?? 0,
      },
      "approveReconciliation completed",
    );
  });

  return ok({
    reconciliationId: parsed.data.reconciliationId,
    discrepancyFound,
  });
}
