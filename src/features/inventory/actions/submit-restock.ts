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
  SUBMIT_RESTOCK_RATE_TOKENS,
  SUBMIT_RESTOCK_RATE_WINDOW,
} from "@/features/inventory/constants";
import { submitRestockSchema } from "@/features/inventory/schemas/submit-restock";

export type SubmitRestockResult = Readonly<{
  requisitionId: string;
}>;

const limiter = createRateLimiter({
  tokens: SUBMIT_RESTOCK_RATE_TOKENS,
  window: SUBMIT_RESTOCK_RATE_WINDOW,
  prefix: "inventory-submit-restock",
});

/**
 * Creates a material requisition with line items.
 *
 * from_location_id resolution (operational_workflows.md:1087 —
 * "from_location_id = warehouse"): we look up the canonical "Warehouse"
 * location seeded at init_schema.sql:1202. Crew restock requests always
 * pull from that source — falling back to "first non-target location"
 * (the prior heuristic) was brittle whenever new locations were added.
 *
 * movement_type_code per line:
 *   - '201' = consumable goods issue (is_consumable = true)
 *   - '311' = stock transfer (is_consumable = false / null)
 */
export async function submitRestockAction(
  input: unknown,
): Promise<ServerActionResult<SubmitRestockResult>> {
  // Step 1: Validate input
  const parsed = submitRestockSchema.safeParse(input);
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
  if (!appMeta.domains?.["inventory_ops"]?.includes("c")) return fail("FORBIDDEN");

  // Step 3: Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Step 4: Resolve from_location_id — the canonical Warehouse location
  // (seed.sql:1202). Crew can never restock-from-self.
  const { data: warehouse, error: locError } = await supabase
    .from("locations")
    .select("id")
    .eq("name", "Warehouse")
    .eq("is_active", true)
    .maybeSingle();
  if (locError) return fail("INTERNAL");
  if (!warehouse) return fail("NOT_FOUND", { form: "Warehouse location is not configured." });
  if (warehouse.id === parsed.data.to_location_id) {
    return fail("VALIDATION_FAILED", {
      to_location_id: "Cannot restock the warehouse from itself.",
    });
  }

  // Step 5: Resolve movement_type_code for each item
  const materialIds = parsed.data.items.map((i) => i.material_id);
  const { data: categoriesRaw, error: catError } = await supabase
    .from("materials")
    .select("id, category_id, material_categories!inner(is_consumable)")
    .in("id", materialIds);
  if (catError) return fail("INTERNAL");

  const consumableMap = new Map<string, boolean>();
  for (const m of categoriesRaw ?? []) {
    const cat = m.material_categories as { is_consumable: boolean | null };
    consumableMap.set(m.id, cat?.is_consumable === true);
  }

  // Step 6: Call RPC to create requisition and items atomically
  const itemsInsert = parsed.data.items.map((item) => ({
    material_id: item.material_id,
    requested_qty: item.requested_qty,
    movement_type_code: consumableMap.get(item.material_id) ? "201" : "311",
  }));

  const idempotencyKey = parsed.data.idempotencyKey ?? crypto.randomUUID();

  // Generated RPC types over-restrict NULL-accepting parameters (Supabase
  // type generator emits non-null types for SQL params without explicit
  // NOT NULL). Cast nullable args to match the strict signature.
  const { data: requisitionId, error: rpcError } = await supabase.rpc("rpc_create_requisition", {
    p_from_location_id: warehouse.id,
    p_to_location_id: parsed.data.to_location_id,
    p_requester_remark: (parsed.data.requester_remark ?? null) as string,
    p_created_by: user.id,
    p_items: itemsInsert,
    p_idempotency_key: idempotencyKey,
  });

  if (rpcError) {
    if (rpcError.code === "23505" && rpcError.message.includes("duplicate_transaction")) {
      return fail("RATE_LIMITED", { form: "This request was already submitted." });
    }
    return fail("INTERNAL");
  }

  // Step 8: Invalidate router cache
  for (const path of INVENTORY_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "submit_restock",
      user_id: user.id,
    });
    log.info({ requisitionId }, "submitRestockAction completed");
  });

  return ok({ requisitionId: requisitionId as string });
}
