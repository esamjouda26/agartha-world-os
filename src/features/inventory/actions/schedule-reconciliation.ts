"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INVENTORY_ROUTER_PATHS } from "@/features/inventory/cache-tags";
import {
  RECONCILIATION_SCHEDULE_RATE_TOKENS,
  RECONCILIATION_SCHEDULE_RATE_WINDOW,
} from "@/features/inventory/constants";
import { scheduleReconciliationSchema } from "@/features/inventory/schemas/schedule-reconciliation";

const limiter = createRateLimiter({
  tokens: RECONCILIATION_SCHEDULE_RATE_TOKENS,
  window: RECONCILIATION_SCHEDULE_RATE_WINDOW,
  prefix: "inventory-schedule-reconciliation",
});

/**
 * Schedule a stock reconciliation (WF-11 step 1).
 *
 * Per WF-11 (operational_workflows.md:1142-1144) the manager picks a
 * location, assigns a runner, and snapshots `system_qty` from
 * `stock_balance_cache` per material at creation time. The runner then
 * counts blind at /crew/logistics/stock-count.
 *
 * Pipeline:
 *   1. Zod parse
 *   2. AuthN + RBAC (inventory_ops:c)
 *   3. Rate limit
 *   4. Snapshot system_qty per material from stock_balance_cache —
 *      missing rows default to 0 (count starts from zero)
 *   5. INSERT inventory_reconciliations
 *   6. INSERT inventory_reconciliation_items (with system_qty snapshot)
 *   7. revalidatePath (ADR-0006)
 *   8. Structured log via after()
 */
export async function scheduleReconciliation(
  input: unknown,
): Promise<ServerActionResult<{ reconciliationId: string }>> {
  // 1. Zod parse
  const parsed = scheduleReconciliationSchema.safeParse(input);
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
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.inventory_ops?.includes("c")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  // De-dupe material IDs in case the form submitted duplicates — the
  // composite UNIQUE on (reconciliation_id, material_id) would reject
  // them anyway (init_schema.sql:2826).
  const materialIds = Array.from(new Set(d.materialIds));

  // 4. Snapshot system_qty per material at the chosen location.
  const { data: stockRows, error: stockErr } = await supabase
    .from("stock_balance_cache")
    .select("material_id, current_qty")
    .eq("location_id", d.locationId)
    .in("material_id", materialIds);
  if (stockErr) {
    const log = loggerWith({
      feature: "inventory",
      event: "schedule_reconciliation",
      user_id: user.id,
    });
    log.error(
      { code: stockErr.code, message: stockErr.message },
      "stock snapshot failed",
    );
    return fail("INTERNAL");
  }
  const systemQtyByMaterial = new Map<string, number>();
  for (const row of stockRows ?? []) {
    systemQtyByMaterial.set(row.material_id, Number(row.current_qty ?? 0));
  }

  // 5. Build items JSON array
  const itemRows = materialIds.map((materialId) => ({
    material_id: materialId,
    system_qty: systemQtyByMaterial.get(materialId) ?? 0,
  }));

  const idempotencyKey = d.idempotencyKey ?? crypto.randomUUID();

  // 6. Call rpc_schedule_reconciliation
  const { data: reconId, error: rpcErr } = await supabase.rpc(
    // @ts-expect-error: Database types not yet synced with remote migrations
    "rpc_schedule_reconciliation",
    {
      p_location_id: d.locationId,
      p_scheduled_date: d.scheduledDate,
      p_scheduled_time: d.scheduledTime,
      p_assigned_to: d.assignedToId,
      p_manager_remark: d.managerRemark,
      p_created_by: user.id,
      p_items: itemRows,
      p_idempotency_key: idempotencyKey,
    },
  );

  if (rpcErr || !reconId) {
    if (rpcErr?.message === "fk_violation") {
      return fail("VALIDATION_FAILED", {
        form: "Selected location or runner is no longer available.",
      });
    }
    
    const log = loggerWith({
      feature: "inventory",
      event: "schedule_reconciliation",
      user_id: user.id,
    });
    
    if (rpcErr?.message === "duplicate_transaction") {
      log.warn("idempotency_conflict");
      return fail("RATE_LIMITED");
    }

    log.error(
      { code: rpcErr?.code, message: rpcErr?.message },
      "rpc_schedule_reconciliation failed",
    );
    return fail("INTERNAL");
  }

  // 7. Invalidate cache (ADR-0006)
  for (const p of INVENTORY_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "schedule_reconciliation",
      user_id: user.id,
    });
    log.info(
      { reconciliation_id: reconId, item_count: materialIds.length },
      "scheduleReconciliation completed",
    );
  });

  return ok({ reconciliationId: reconId as string });
}
