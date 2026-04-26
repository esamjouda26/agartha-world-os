"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OPERATIONS_ROUTER_PATHS } from "@/features/operations/cache-tags";
import {
  createExperienceSchema,
  updateExperienceSchema,
  createTierSchema,
  updateTierSchema,
  createTierPerkSchema,
  upsertSchedulerConfigSchema,
  generateSlotsSchema,
} from "@/features/operations/schemas/experience";

// ── Rate limiter ────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: 60,
  window: "60 s",
  prefix: "ops-experience",
});

// ── Helpers ─────────────────────────────────────────────────────────────

async function requireBookingC() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, supabase, error: fail<never>("UNAUTHENTICATED") };
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const bookingAccess = appMeta.domains?.booking ?? [];
  if (!bookingAccess.includes("c"))
    return { user, supabase, error: fail<never>("FORBIDDEN") };
  return { user, supabase, error: null };
}

function invalidateCache() {
  for (const path of OPERATIONS_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
}

// ── Experience CRUD ─────────────────────────────────────────────────────

export async function createExperience(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createExperienceSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const { user, supabase, error } = await requireBookingC();
  if (error) return error;

  const lim = await limiter.limit(user!.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  const { data: record, error: dbErr } = await supabase
    .from("experiences")
    .insert({
      name: d.name,
      capacity_per_slot: d.capacityPerSlot,
      max_facility_capacity: d.maxFacilityCapacity,
      arrival_window_minutes: d.arrivalWindowMinutes,
      is_active: d.isActive,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (dbErr || !record) {
    const log = loggerWith({ feature: "operations", event: "create-experience", user_id: user!.id });
    log.error({ error: dbErr?.message }, "failed to create experience");
    return fail("INTERNAL");
  }

  invalidateCache();
  after(async () => {
    const log = loggerWith({ feature: "operations", event: "create-experience", user_id: user!.id });
    log.info({ experience_id: record.id }, "createExperience completed");
  });

  return ok({ id: record.id });
}

export async function updateExperience(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = updateExperienceSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const { user, supabase, error } = await requireBookingC();
  if (error) return error;

  const lim = await limiter.limit(user!.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  const { error: dbErr } = await supabase
    .from("experiences")
    .update({
      name: d.name,
      capacity_per_slot: d.capacityPerSlot,
      max_facility_capacity: d.maxFacilityCapacity,
      arrival_window_minutes: d.arrivalWindowMinutes,
      is_active: d.isActive,
      updated_by: user!.id,
    })
    .eq("id", d.id);

  if (dbErr) {
    const log = loggerWith({ feature: "operations", event: "update-experience", user_id: user!.id });
    log.error({ error: dbErr.message }, "failed to update experience");
    return fail("INTERNAL");
  }

  invalidateCache();
  after(async () => {
    const log = loggerWith({ feature: "operations", event: "update-experience", user_id: user!.id });
    log.info({ experience_id: d.id }, "updateExperience completed");
  });

  return ok({ id: d.id });
}

// ── Tier CRUD ───────────────────────────────────────────────────────────

export async function createTier(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createTierSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const { user, supabase, error } = await requireBookingC();
  if (error) return error;

  const lim = await limiter.limit(user!.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  const { data: record, error: dbErr } = await supabase
    .from("tiers")
    .insert({
      name: d.name,
      adult_price: d.adultPrice,
      child_price: d.childPrice,
      duration_minutes: d.durationMinutes,
      sort_order: d.sortOrder,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (dbErr || !record) {
    const log = loggerWith({ feature: "operations", event: "create-tier", user_id: user!.id });
    log.error({ error: dbErr?.message }, "failed to create tier");
    return fail("INTERNAL");
  }

  invalidateCache();
  after(async () => {
    const log = loggerWith({ feature: "operations", event: "create-tier", user_id: user!.id });
    log.info({ tier_id: record.id }, "createTier completed");
  });

  return ok({ id: record.id });
}

export async function updateTier(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = updateTierSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const { user, supabase, error } = await requireBookingC();
  if (error) return error;

  const lim = await limiter.limit(user!.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  const { error: dbErr } = await supabase
    .from("tiers")
    .update({
      name: d.name,
      adult_price: d.adultPrice,
      child_price: d.childPrice,
      duration_minutes: d.durationMinutes,
      sort_order: d.sortOrder,
      updated_by: user!.id,
    })
    .eq("id", d.id);

  if (dbErr) {
    const log = loggerWith({ feature: "operations", event: "update-tier", user_id: user!.id });
    log.error({ error: dbErr.message }, "failed to update tier");
    return fail("INTERNAL");
  }

  invalidateCache();
  after(async () => {
    const log = loggerWith({ feature: "operations", event: "update-tier", user_id: user!.id });
    log.info({ tier_id: d.id }, "updateTier completed");
  });

  return ok({ id: d.id });
}

// ── Tier Perks ──────────────────────────────────────────────────────────

export async function addTierPerk(
  input: unknown,
): Promise<ServerActionResult<{ tierId: string }>> {
  const parsed = createTierPerkSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const { user, supabase, error } = await requireBookingC();
  if (error) return error;

  const lim = await limiter.limit(user!.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error: dbErr } = await supabase
    .from("tier_perks")
    .insert({ tier_id: parsed.data.tierId, perk: parsed.data.perk });

  if (dbErr) {
    const log = loggerWith({ feature: "operations", event: "add-tier-perk", user_id: user!.id });
    log.error({ error: dbErr.message }, "failed to add tier perk");
    return fail("INTERNAL");
  }

  invalidateCache();
  return ok({ tierId: parsed.data.tierId });
}

export async function removeTierPerk(
  tierId: string,
  perk: string,
): Promise<ServerActionResult<{ tierId: string }>> {
  const { user, supabase, error } = await requireBookingC();
  if (error) return error;

  const lim = await limiter.limit(user!.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error: dbErr } = await supabase
    .from("tier_perks")
    .delete()
    .eq("tier_id", tierId)
    .eq("perk", perk);

  if (dbErr) {
    const log = loggerWith({ feature: "operations", event: "remove-tier-perk", user_id: user!.id });
    log.error({ error: dbErr.message }, "failed to remove tier perk");
    return fail("INTERNAL");
  }

  invalidateCache();
  return ok({ tierId });
}

// ── Experience-Tier Junction ────────────────────────────────────────────

export async function setExperienceTiers(
  experienceId: string,
  tierIds: string[],
): Promise<ServerActionResult<{ experienceId: string }>> {
  const { user, supabase, error } = await requireBookingC();
  if (error) return error;

  const lim = await limiter.limit(user!.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Delete existing, then insert new
  const { error: delErr } = await supabase
    .from("experience_tiers")
    .delete()
    .eq("experience_id", experienceId);
  if (delErr) {
    const log = loggerWith({ feature: "operations", event: "set-experience-tiers", user_id: user!.id });
    log.error({ error: delErr.message }, "failed to clear experience tiers");
    return fail("INTERNAL");
  }

  if (tierIds.length > 0) {
    const { error: insErr } = await supabase
      .from("experience_tiers")
      .insert(tierIds.map((tid) => ({ experience_id: experienceId, tier_id: tid })));
    if (insErr) {
      const log = loggerWith({ feature: "operations", event: "set-experience-tiers", user_id: user!.id });
      log.error({ error: insErr.message }, "failed to insert experience tiers");
      return fail("INTERNAL");
    }
  }

  invalidateCache();
  return ok({ experienceId });
}

// ── Scheduler Config ────────────────────────────────────────────────────

export async function upsertSchedulerConfig(
  input: unknown,
): Promise<ServerActionResult<{ experienceId: string }>> {
  const parsed = upsertSchedulerConfigSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const { user, supabase, error } = await requireBookingC();
  if (error) return error;

  const lim = await limiter.limit(user!.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  const { error: dbErr } = await supabase.from("scheduler_config").upsert(
    {
      experience_id: d.experienceId,
      days_ahead: d.daysAhead,
      day_start_hour: d.dayStartHour,
      day_end_hour: d.dayEndHour,
      start_date: d.startDate,
      end_date: d.endDate,
      updated_by: user!.id,
    },
    { onConflict: "experience_id" },
  );

  if (dbErr) {
    const log = loggerWith({ feature: "operations", event: "upsert-scheduler-config", user_id: user!.id });
    log.error({ error: dbErr.message }, "failed to upsert scheduler config");
    return fail("INTERNAL");
  }

  invalidateCache();
  return ok({ experienceId: d.experienceId });
}

// ── Generate Slots ──────────────────────────────────────────────────────

export async function generateSlots(
  input: unknown,
): Promise<ServerActionResult<{ count: number }>> {
  const parsed = generateSlotsSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }

  const { user, supabase, error } = await requireBookingC();
  if (error) return error;

  const lim = await limiter.limit(user!.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  const { data, error: rpcErr } = await supabase.rpc("rpc_generate_time_slots", {
    p_experience_id: d.experienceId,
    p_start_date: d.startDate,
    p_days: d.days,
    p_slot_interval_minutes: d.slotIntervalMinutes,
    p_day_start_hour: d.dayStartHour,
    p_day_end_hour: d.dayEndHour,
  });

  if (rpcErr) {
    const log = loggerWith({ feature: "operations", event: "generate-slots", user_id: user!.id });
    log.error({ error: rpcErr.message }, "failed to generate time slots");
    return fail("INTERNAL");
  }

  invalidateCache();
  after(async () => {
    const log = loggerWith({ feature: "operations", event: "generate-slots", user_id: user!.id });
    log.info({ experience_id: d.experienceId, count: data }, "generateSlots completed");
  });

  return ok({ count: typeof data === "number" ? data : 0 });
}
