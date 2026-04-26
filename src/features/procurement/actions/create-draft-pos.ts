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
  REORDER_RATE_TOKENS,
  REORDER_RATE_WINDOW,
} from "@/features/procurement/constants";
import { createDraftPosSchema } from "@/features/procurement/schemas/material";

// ── Rate limiter ────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: REORDER_RATE_TOKENS,
  window: REORDER_RATE_WINDOW,
  prefix: "procurement-create-draft-pos",
});

// ── Create Draft Purchase Orders ────────────────────────────────────────

/**
 * Groups selected materials by default supplier → creates one
 * purchase_orders (status = 'draft') per supplier + purchase_order_items
 * per material.
 *
 * Spec: frontend_spec.md §3b `/management/procurement/reorder` INTERACTIONS.
 * WF-9: Purchase Order Lifecycle — Reorder Dashboard → "Create Draft POs".
 * RBAC: procurement:c.
 * INSERT purchase_orders + purchase_order_items → revalidatePath (ADR-0006).
 */
export async function createDraftPos(
  input: unknown,
): Promise<ServerActionResult<{ poIds: string[] }>> {
  // 1. Zod parse
  const parsed = createDraftPosSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires procurement:c
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.procurement?.includes("c")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Group items by supplier
  const d = parsed.data;
  const supplierGroups = new Map<
    string,
    Array<{
      materialId: string;
      orderQty: number;
      unitPrice: number;
    }>
  >();
  for (const item of d.items) {
    if (!supplierGroups.has(item.supplierId)) {
      supplierGroups.set(item.supplierId, []);
    }
    supplierGroups.get(item.supplierId)!.push({
      materialId: item.materialId,
      orderQty: item.orderQty,
      unitPrice: item.unitPrice,
    });
  }

  // 5. Create one PO per supplier + line items
  const poIds: string[] = [];
  const log = loggerWith({
    feature: "procurement",
    event: "create-draft-pos",
    user_id: user.id,
  });

  for (const [supplierId, items] of supplierGroups) {
    // Insert PO header
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({
        supplier_id: supplierId,
        receiving_location_id: d.receivingLocationId,
        status: "draft",
        order_date: new Date().toISOString(),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (poErr || !po) {
      log.error(
        {
          error: poErr?.message,
          code: poErr?.code,
          supplier_id: supplierId,
        },
        "failed to create draft PO",
      );
      return fail("INTERNAL");
    }

    poIds.push(po.id);

    // Insert PO line items
    const lineItems = items.map((item) => ({
      po_id: po.id,
      material_id: item.materialId,
      expected_qty: item.orderQty,
      received_qty: 0,
      unit_price: item.unitPrice,
    }));

    const { error: itemsErr } = await supabase
      .from("purchase_order_items")
      .insert(lineItems);

    if (itemsErr) {
      log.error(
        {
          error: itemsErr.message,
          code: itemsErr.code,
          po_id: po.id,
        },
        "failed to create PO line items",
      );
      return fail("INTERNAL");
    }
  }

  // 6. Invalidate cache
  for (const path of PROCUREMENT_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    log.info(
      {
        po_ids: poIds,
        item_count: d.items.length,
        supplier_count: supplierGroups.size,
        location_id: d.receivingLocationId,
      },
      "createDraftPos completed",
    );
  });

  return ok({ poIds });
}
