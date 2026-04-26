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
  MANAGER_REQUISITION_CRUD_RATE_TOKENS,
  MANAGER_REQUISITION_CRUD_RATE_WINDOW,
} from "@/features/inventory/constants";
import { createRequisitionSchema } from "@/features/inventory/schemas/create-requisition";

const limiter = createRateLimiter({
  tokens: MANAGER_REQUISITION_CRUD_RATE_TOKENS,
  window: MANAGER_REQUISITION_CRUD_RATE_WINDOW,
  prefix: "inventory-manager-create-requisition",
});

/**
 * Manager-side INSERT path for `material_requisitions` per
 * `/management/inventory/requisitions` (frontend_spec.md:2056) and WF-10
 * (operational_workflows.md:1097-1098 — "Inventory manager can also
 * create requisitions").
 *
 * Pipeline (CLAUDE.md §4):
 *   1. Zod parse
 *   2. AuthN + RBAC (inventory_ops:c)
 *   3. Rate limit
 *   4. Resolve movement_type_code per item from material_categories
 *      .is_consumable: '201' consumable / '311' transfer (matches WF-10
 *      :1094 + the crew-side submitRestockAction pattern).
 *   5. INSERT material_requisitions
 *   6. INSERT material_requisition_items (one per line)
 *   7. Per-feature revalidatePath (ADR-0006)
 *   8. Structured log via after()
 */
export async function createRequisition(
  input: unknown,
): Promise<ServerActionResult<{ requisitionId: string }>> {
  // 1. Zod parse
  const parsed = createRequisitionSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — inventory_ops:c (mirrors RLS; same gate as crew)
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

  // 4. Resolve movement_type_code per item from material_categories
  const materialIds = d.items.map((i) => i.materialId);
  const { data: catRows, error: catErr } = await supabase
    .from("materials")
    .select("id, material_categories!inner(is_consumable)")
    .in("id", materialIds);
  if (catErr) {
    const log = loggerWith({
      feature: "inventory",
      event: "manager_create_requisition",
      user_id: user.id,
    });
    log.error(
      { code: catErr.code, message: catErr.message },
      "category resolution failed",
    );
    return fail("INTERNAL");
  }
  const consumableMap = new Map<string, boolean>();
  for (const m of catRows ?? []) {
    const cat = m.material_categories as { is_consumable: boolean | null };
    consumableMap.set(m.id, cat?.is_consumable === true);
  }
  // Reject silently dropped materials — every line MUST resolve a category.
  for (const m of materialIds) {
    if (!consumableMap.has(m)) {
      return fail("VALIDATION_FAILED", {
        items: "One or more selected materials no longer exist",
      });
    }
  }

  // 5. Build items JSON array
  const itemRows = d.items.map((item) => ({
    material_id: item.materialId,
    requested_qty: item.requestedQty,
    movement_type_code: consumableMap.get(item.materialId) ? "201" : "311",
  }));

  const idempotencyKey = d.idempotencyKey ?? crypto.randomUUID();

  // 6. Call rpc_create_requisition
  const { data: reqId, error: rpcErr } = await supabase.rpc(
    // @ts-expect-error: Database types not yet synced with remote migrations
    "rpc_create_requisition",
    {
      p_from_location_id: d.fromLocationId,
      p_to_location_id: d.toLocationId,
      p_requester_remark: d.requesterRemark,
      p_created_by: user.id,
      p_items: itemRows,
      p_idempotency_key: idempotencyKey,
    },
  );

  if (rpcErr || !reqId) {
    const log = loggerWith({
      feature: "inventory",
      event: "manager_create_requisition",
      user_id: user.id,
    });
    
    if (rpcErr?.message === "duplicate_transaction") {
      log.warn("idempotency_conflict");
      return fail("RATE_LIMITED");
    }

    log.error(
      { code: rpcErr?.code, message: rpcErr?.message },
      "rpc_create_requisition failed",
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
      event: "manager_create_requisition",
      user_id: user.id,
    });
    log.info(
      { requisition_id: reqId, item_count: d.items.length },
      "createRequisition completed",
    );
  });

  return ok({ requisitionId: reqId as string });
}
