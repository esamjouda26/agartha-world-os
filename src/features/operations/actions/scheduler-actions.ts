"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OPERATIONS_ROUTER_PATHS } from "@/features/operations/cache-tags";
import { editSlotSchema } from "@/features/operations/schemas/scheduler";

const limiter = createRateLimiter({ tokens: 30, window: "60 s", prefix: "ops-scheduler" });

function invalidateCache() {
  for (const path of OPERATIONS_ROUTER_PATHS) revalidatePath(path, "page");
}

// ── Preview Types ─────────────────────────────────────────────────────

export type CascadeMove = Readonly<{
  bookingId: string;
  currentSlotDate: string;
  currentSlotTime: string;
  targetSlotId: string;
  targetSlotDate: string;
  targetSlotTime: string;
}>;

export type PreviewResult = Readonly<{
  overflowCount: number;
  moves: CascadeMove[];
}>;

// ── Preview Slot Override ─────────────────────────────────────────────

/**
 * Step 1 of the two-step cascade flow.
 * Calls `rpc_preview_slot_override` (STABLE — no mutations) to show
 * which bookings would be cascaded before the manager confirms.
 */
export async function previewSlotOverride(
  slotId: string,
  newCapacity: number,
): Promise<ServerActionResult<PreviewResult>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!(appMeta.domains?.booking ?? []).includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { data: rows, error: rpcErr } = await supabase.rpc("rpc_preview_slot_override", {
    p_slot_id: slotId,
    p_new_capacity: newCapacity,
  });

  if (rpcErr) {
    const log = loggerWith({ feature: "operations", event: "preview-slot-override", user_id: user.id });
    log.error({ error: rpcErr.message }, "failed to preview slot override");
    return fail("INTERNAL");
  }

  const moves: CascadeMove[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    bookingId: String(r.booking_id),
    currentSlotDate: String(r.current_slot_date),
    currentSlotTime: String(r.current_slot_time),
    targetSlotId: String(r.target_slot_id),
    targetSlotDate: String(r.target_slot_date),
    targetSlotTime: String(r.target_slot_time),
  }));

  return ok({ overflowCount: moves.length, moves });
}

// ── Edit Slot (Confirm) ───────────────────────────────────────────────

/**
 * Edit a time slot — capacity override + constraint.
 * When new capacity >= booked_count: direct UPDATE (no overflow).
 * When new capacity < booked_count (overflow): Step 2 of the two-step
 * cascade flow — calls `rpc_confirm_slot_override` for atomic cascade.
 * The UI must call `previewSlotOverride` first and show the cascade plan.
 */
export async function editSlot(
  input: unknown,
): Promise<ServerActionResult<{ slotId: string }>> {
  const parsed = editSlotSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");

  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  if (!(appMeta.domains?.booking ?? []).includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;

  // Check current booked_count — .single() because slot must exist
  const { data: slot, error: fetchErr } = await supabase
    .from("time_slots")
    .select("booked_count")
    .eq("id", d.slotId)
    .single();

  if (fetchErr || !slot) return fail("INTERNAL");

  const bookedCount = slot.booked_count ?? 0;

  if (d.overrideCapacity >= bookedCount) {
    // Simple update — no overflow
    const { error: upErr } = await supabase
      .from("time_slots")
      .update({
        override_capacity: d.overrideCapacity,
        constraint_type: d.constraintType,
        constraint_notes: d.constraintNotes,
      })
      .eq("id", d.slotId);

    if (upErr) {
      const log = loggerWith({ feature: "operations", event: "edit-slot", user_id: user.id });
      log.error({ error: upErr.message }, "failed to update slot");
      return fail("INTERNAL");
    }
  } else {
    // Overflow — use RPC for atomic cascade
    const { error: rpcErr } = await supabase.rpc("rpc_confirm_slot_override", {
      p_slot_id: d.slotId,
      p_new_capacity: d.overrideCapacity,
      ...(d.constraintType ? { p_constraint_type: d.constraintType } : {}),
      ...(d.constraintNotes ? { p_constraint_notes: d.constraintNotes } : {}),
    });

    if (rpcErr) {
      const log = loggerWith({ feature: "operations", event: "edit-slot-cascade", user_id: user.id });
      log.error({ error: rpcErr.message }, "failed to cascade slot override");
      return fail("INTERNAL");
    }
  }

  invalidateCache();
  after(async () => {
    const log = loggerWith({ feature: "operations", event: "edit-slot", user_id: user.id });
    log.info({ slot_id: d.slotId, new_capacity: d.overrideCapacity }, "editSlot completed");
  });

  return ok({ slotId: d.slotId });
}
