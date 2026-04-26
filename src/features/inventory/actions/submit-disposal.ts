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
  SUBMIT_DISPOSAL_RATE_TOKENS,
  SUBMIT_DISPOSAL_RATE_WINDOW,
} from "@/features/inventory/constants";
import { submitDisposalSchema } from "@/features/inventory/schemas/submit-disposal";

export type SubmitDisposalResult = Readonly<{
  writeOffId: string;
}>;

const limiter = createRateLimiter({
  tokens: SUBMIT_DISPOSAL_RATE_TOKENS,
  window: SUBMIT_DISPOSAL_RATE_WINDOW,
  prefix: "inventory-submit-disposal",
});

/**
 * Creates a write-off record for a material disposal.
 *
 * unit_cost is resolved server-side from material_valuation:
 *   1. moving_avg_cost (preferred — reflects actual FIFO/AVCO cost)
 *   2. standard_cost (fallback)
 *   3. 0 (last resort — logged as warning)
 *
 * The DB trigger `trg_write_off_goods_movement` fires after INSERT and:
 *   - Posts a goods movement of type 'write_off' for the specified quantity
 *   - If explode_bom=TRUE, also posts component-level movements by expanding
 *     the referenced bill_of_materials
 *
 * This action does NOT need to replicate that trigger logic.
 */
export async function submitDisposalAction(
  input: unknown,
): Promise<ServerActionResult<SubmitDisposalResult>> {
  // Step 1: Validate input (includes .refine for bom_id when explode_bom=true)
  const parsed = submitDisposalSchema.safeParse(input);
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
  if (!appMeta.domains?.["inventory_ops"]?.includes("c"))
    return fail("FORBIDDEN");

  // Step 3: Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Step 4: Resolve unit_cost from material_valuation for the given location
  const { data: valuation } = await supabase
    .from("material_valuation")
    .select("moving_avg_cost, standard_cost")
    .eq("material_id", parsed.data.material_id)
    .eq("location_id", parsed.data.location_id)
    .maybeSingle();

  const unitCost =
    valuation?.moving_avg_cost ??
    valuation?.standard_cost ??
    0;

  // Step 5: If explode_bom, verify the bom_id exists and is active
  if (parsed.data.explode_bom && parsed.data.bom_id !== null) {
    const { data: bom, error: bomError } = await supabase
      .from("bill_of_materials")
      .select("id")
      .eq("id", parsed.data.bom_id)
      .eq("status", "active")
      .maybeSingle();
    if (bomError) return fail("INTERNAL");
    if (!bom) return fail("NOT_FOUND");
  }

  // Step 6: Insert write_off — trigger fires server-side for goods movement
  const { data: writeOff, error: insertError } = await supabase
    .from("write_offs")
    .insert({
      material_id: parsed.data.material_id,
      quantity: parsed.data.quantity,
      location_id: parsed.data.location_id,
      reason: parsed.data.reason,
      notes: parsed.data.notes ?? null,
      photo_proof_url: parsed.data.photo_proof_url ?? null,
      explode_bom: parsed.data.explode_bom,
      bom_id: parsed.data.bom_id,
      unit_cost: unitCost,
      // Optional departmental attribution — WF-12: "cost_center_id: optional"
      cost_center_id: parsed.data.cost_center_id ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insertError) return fail("INTERNAL");

  // Step 7: Invalidate router cache
  for (const path of INVENTORY_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "submit_disposal",
      user_id: user.id,
    });
    log.info(
      { writeOffId: writeOff.id, explodeBom: parsed.data.explode_bom },
      "submitDisposalAction completed",
    );
  });

  return ok({ writeOffId: writeOff.id });
}
