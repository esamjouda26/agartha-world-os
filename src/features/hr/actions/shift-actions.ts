"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HR_ROUTER_PATHS } from "@/features/hr/cache-tags";
import {
  createShiftTypeSchema,
  updateShiftTypeSchema,
  createRosterTemplateSchema,
  updateRosterTemplateSchema,
  upsertTemplateShiftSchema,
  deleteTemplateShiftSchema,
  createStaffAssignmentSchema,
  updateStaffAssignmentSchema,
  updateScheduleSchema,
  applyPatternSchema,
  markDayOffSchema,
  deleteHolidaySchema,
} from "@/features/hr/schemas/shifts";

const limiter = createRateLimiter({ tokens: 100, window: "60 s", prefix: "hr-shifts" });

// ── Helpers ────────────────────────────────────────────────────────────

async function authGuard(requiredAccess: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "UNAUTHENTICATED" as const, supabase, user: null };
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes(requiredAccess))
    return { error: "FORBIDDEN" as const, supabase, user: null };
  const lim = await limiter.limit(user.id);
  if (!lim.success) return { error: "RATE_LIMITED" as const, supabase, user: null };
  return { error: null, supabase, user };
}

function revalidateShifts() {
  for (const path of HR_ROUTER_PATHS) revalidatePath(path, "page");
}

// ── Shift Types CRUD ───────────────────────────────────────────────────

export async function createShiftType(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createShiftTypeSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("c");
  if (authErr) return fail(authErr);

  const d = parsed.data;
  const { data, error } = await supabase
    .from("shift_types")
    .insert({
      code: d.code,
      name: d.name,
      start_time: d.startTime,
      end_time: d.endTime,
      break_duration_minutes: d.breakDurationMinutes,
      grace_late_arrival_minutes: d.graceLateArrivalMinutes,
      grace_early_departure_minutes: d.graceEarlyDepartureMinutes,
      max_late_clock_in_minutes: d.maxLateClockInMinutes,
      max_early_clock_in_minutes: d.maxEarlyClockInMinutes,
      max_late_clock_out_minutes: d.maxLateClockOutMinutes,
      color: d.color ?? null,
      is_active: d.isActive,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    loggerWith({ feature: "hr", event: "create-shift-type" }).error(
      { error: error?.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok({ id: data.id });
}

export async function updateShiftType(input: unknown): Promise<ServerActionResult<void>> {
  const parsed = updateShiftTypeSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("u");
  if (authErr) return fail(authErr);

  const { id, ...fields } = parsed.data;
  const { error } = await supabase
    .from("shift_types")
    .update({
      ...(fields.code !== undefined ? { code: fields.code } : {}),
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.startTime !== undefined ? { start_time: fields.startTime } : {}),
      ...(fields.endTime !== undefined ? { end_time: fields.endTime } : {}),
      ...(fields.breakDurationMinutes !== undefined
        ? { break_duration_minutes: fields.breakDurationMinutes }
        : {}),
      ...(fields.graceLateArrivalMinutes !== undefined
        ? { grace_late_arrival_minutes: fields.graceLateArrivalMinutes }
        : {}),
      ...(fields.graceEarlyDepartureMinutes !== undefined
        ? { grace_early_departure_minutes: fields.graceEarlyDepartureMinutes }
        : {}),
      ...(fields.maxLateClockInMinutes !== undefined
        ? { max_late_clock_in_minutes: fields.maxLateClockInMinutes }
        : {}),
      ...(fields.maxEarlyClockInMinutes !== undefined
        ? { max_early_clock_in_minutes: fields.maxEarlyClockInMinutes }
        : {}),
      ...(fields.maxLateClockOutMinutes !== undefined
        ? { max_late_clock_out_minutes: fields.maxLateClockOutMinutes }
        : {}),
      ...(fields.color !== undefined ? { color: fields.color } : {}),
      ...(fields.isActive !== undefined ? { is_active: fields.isActive } : {}),
      updated_by: user!.id,
    })
    .eq("id", id);
  if (error) {
    loggerWith({ feature: "hr", event: "update-shift-type" }).error(
      { error: error.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok(undefined);
}

// ── Roster Templates CRUD ──────────────────────────────────────────────

export async function createRosterTemplate(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createRosterTemplateSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("c");
  if (authErr) return fail(authErr);

  const d = parsed.data;
  const { data, error } = await supabase
    .from("roster_templates")
    .insert({
      name: d.name,
      cycle_length_days: d.cycleLengthDays,
      anchor_date: d.anchorDate,
      is_active: d.isActive,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    loggerWith({ feature: "hr", event: "create-roster-template" }).error(
      { error: error?.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok({ id: data.id });
}

export async function updateRosterTemplate(input: unknown): Promise<ServerActionResult<void>> {
  const parsed = updateRosterTemplateSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("u");
  if (authErr) return fail(authErr);

  const { id, ...fields } = parsed.data;
  const { error } = await supabase
    .from("roster_templates")
    .update({
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.cycleLengthDays !== undefined
        ? { cycle_length_days: fields.cycleLengthDays }
        : {}),
      ...(fields.anchorDate !== undefined ? { anchor_date: fields.anchorDate } : {}),
      ...(fields.isActive !== undefined ? { is_active: fields.isActive } : {}),
      updated_by: user!.id,
    })
    .eq("id", id);
  if (error) {
    loggerWith({ feature: "hr", event: "update-roster-template" }).error(
      { error: error.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok(undefined);
}

// ── Template Shifts (day → shift_type mapping) ─────────────────────────

export async function upsertTemplateShift(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = upsertTemplateShiftSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("c");
  if (authErr) return fail(authErr);

  const d = parsed.data;
  const { data, error } = await supabase
    .from("roster_template_shifts")
    .upsert(
      {
        template_id: d.templateId,
        day_index: d.dayIndex,
        shift_type_id: d.shiftTypeId,
        created_by: user!.id,
      },
      { onConflict: "template_id,day_index" },
    )
    .select("id")
    .single();

  if (error || !data) {
    loggerWith({ feature: "hr", event: "upsert-template-shift" }).error(
      { error: error?.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok({ id: data.id });
}

export async function deleteTemplateShift(input: unknown): Promise<ServerActionResult<void>> {
  const parsed = deleteTemplateShiftSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase } = await authGuard("d");
  if (authErr) return fail(authErr);

  const { error } = await supabase.from("roster_template_shifts").delete().eq("id", parsed.data.id);
  if (error) {
    loggerWith({ feature: "hr", event: "delete-template-shift" }).error(
      { error: error.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok(undefined);
}

// ── Staff Roster Assignments CRUD ──────────────────────────────────────

export async function createStaffAssignment(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createStaffAssignmentSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("c");
  if (authErr) return fail(authErr);

  const d = parsed.data;
  const { data, error } = await supabase
    .from("staff_roster_assignments")
    .insert({
      staff_record_id: d.staffRecordId,
      roster_template_id: d.rosterTemplateId,
      effective_start_date: d.effectiveStartDate,
      effective_end_date: d.effectiveEndDate || null,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    loggerWith({ feature: "hr", event: "create-staff-assignment" }).error(
      { error: error?.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok({ id: data.id });
}

export async function updateStaffAssignment(input: unknown): Promise<ServerActionResult<void>> {
  const parsed = updateStaffAssignmentSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("u");
  if (authErr) return fail(authErr);

  const { id, ...fields } = parsed.data;
  const { error } = await supabase
    .from("staff_roster_assignments")
    .update({
      ...(fields.staffRecordId !== undefined ? { staff_record_id: fields.staffRecordId } : {}),
      ...(fields.rosterTemplateId !== undefined
        ? { roster_template_id: fields.rosterTemplateId }
        : {}),
      ...(fields.effectiveStartDate !== undefined
        ? { effective_start_date: fields.effectiveStartDate }
        : {}),
      ...(fields.effectiveEndDate !== undefined
        ? { effective_end_date: fields.effectiveEndDate || null }
        : {}),
      updated_by: user!.id,
    })
    .eq("id", id);
  if (error) {
    loggerWith({ feature: "hr", event: "update-staff-assignment" }).error(
      { error: error.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok(undefined);
}

export async function deleteStaffAssignment(input: unknown): Promise<ServerActionResult<void>> {
  const parsed = deleteTemplateShiftSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase } = await authGuard("d");
  if (authErr) return fail(authErr);

  const { error } = await supabase
    .from("staff_roster_assignments")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    loggerWith({ feature: "hr", event: "delete-staff-assignment" }).error(
      { error: error.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok(undefined);
}

// ── Schedule Override ──────────────────────────────────────────────────

export async function updateScheduleOverride(input: unknown): Promise<ServerActionResult<void>> {
  const parsed = updateScheduleSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("u");
  if (authErr) return fail(authErr);

  const d = parsed.data;
  const { error } = await supabase
    .from("shift_schedules")
    .update({
      shift_type_id: d.shiftTypeId,
      override_reason: d.overrideReason ?? null,
      updated_by: user!.id,
    })
    .eq("id", d.id);

  if (error) {
    loggerWith({ feature: "hr", event: "update-schedule-override" }).error(
      { error: error.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok(undefined);
}

// ── Apply Pattern Change (RPC) ─────────────────────────────────────────

export async function previewPatternChange(
  input: unknown,
): Promise<ServerActionResult<Record<string, unknown>>> {
  const parsed = applyPatternSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase } = await authGuard("u");
  if (authErr) return fail(authErr);

  const { data, error } = await supabase.rpc("rpc_preview_pattern_change", {
    p_from_date: parsed.data.fromDate,
    p_to_date: parsed.data.toDate,
  });

  if (error) {
    loggerWith({ feature: "hr", event: "preview-pattern-change" }).error(
      { error: error.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  return ok(data as Record<string, unknown>);
}

export async function applyPatternChange(
  input: unknown,
): Promise<ServerActionResult<{ count: number }>> {
  const parsed = applyPatternSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase } = await authGuard("u");
  if (authErr) return fail(authErr);

  const { data, error } = await supabase.rpc("rpc_apply_pattern_change", {
    p_from_date: parsed.data.fromDate,
    p_to_date: parsed.data.toDate,
    p_force_all: parsed.data.forceAll,
  });

  if (error) {
    loggerWith({ feature: "hr", event: "apply-pattern-change" }).error(
      { error: error.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok({ count: data as number });
}

// ── Public Holidays ────────────────────────────────────────────────────

export async function markDayOff(input: unknown): Promise<ServerActionResult<{ id: string }>> {
  const parsed = markDayOffSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase } = await authGuard("c");
  if (authErr) return fail(authErr);

  const { data, error } = await supabase.rpc("rpc_mark_day_off", {
    p_date: parsed.data.date,
    p_name: parsed.data.name,
  });

  if (error) {
    loggerWith({ feature: "hr", event: "mark-day-off" }).error({ error: error.message }, "failed");
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok({ id: data as string });
}

export async function deleteHoliday(input: unknown): Promise<ServerActionResult<void>> {
  const parsed = deleteHolidaySchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase } = await authGuard("d");
  if (authErr) return fail(authErr);

  const { error } = await supabase.from("public_holidays").delete().eq("id", parsed.data.id);
  if (error) {
    loggerWith({ feature: "hr", event: "delete-holiday" }).error(
      { error: error.message },
      "failed",
    );
    return fail("INTERNAL");
  }
  revalidateShifts();
  return ok(undefined);
}
