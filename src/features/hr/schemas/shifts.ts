import { z } from "zod";

/**
 * Lenient UUID format — accepts any 8-4-4-4-12 hex string.
 *
 * Zod v4's `z.string().uuid()` enforces RFC 4122 version (third group
 * first char must be [1-8]) and variant (fourth group first char must be
 * [89abAB]) bits. Our seed data uses synthetic UUIDs like
 * `b1000000-0000-0000-0000-000000000002` which don't satisfy those
 * constraints. This helper validates shape only.
 */
const uuidField = (msg?: string) =>
  z
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      msg ?? "Invalid UUID",
    );

// ── Shift Types ────────────────────────────────────────────────────────

export const createShiftTypeSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(20),
  name: z.string().trim().min(1, "Name is required").max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM format required"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM format required"),
  breakDurationMinutes: z.coerce.number().int().min(0),
  graceLateArrivalMinutes: z.coerce.number().int().min(0),
  graceEarlyDepartureMinutes: z.coerce.number().int().min(0),
  maxLateClockInMinutes: z.coerce.number().int().min(0),
  maxEarlyClockInMinutes: z.coerce.number().int().min(0),
  maxLateClockOutMinutes: z.coerce.number().int().min(0),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
});

export const updateShiftTypeSchema = createShiftTypeSchema.partial().extend({
  id: uuidField(),
});

// ── Roster Templates ───────────────────────────────────────────────────

export const createRosterTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  cycleLengthDays: z.coerce.number().int().min(1).max(366),
  anchorDate: z.string().min(1, "Anchor date is required"),
  isActive: z.boolean().default(true),
});

export const updateRosterTemplateSchema = createRosterTemplateSchema.partial().extend({
  id: uuidField(),
});

// ── Template Shifts (day assignments in a template) ────────────────────

export const upsertTemplateShiftSchema = z.object({
  templateId: uuidField(),
  dayIndex: z.coerce.number().int().min(0),
  shiftTypeId: uuidField(),
});

export const deleteTemplateShiftSchema = z.object({
  id: uuidField(),
});

// ── Staff Roster Assignments ───────────────────────────────────────────

export const createStaffAssignmentSchema = z.object({
  staffRecordId: uuidField("Select a staff member"),
  rosterTemplateId: uuidField("Select a roster template"),
  effectiveStartDate: z.string().min(1, "Start date is required"),
  effectiveEndDate: z.string().optional(),
});

export const updateStaffAssignmentSchema = createStaffAssignmentSchema.partial().extend({
  id: uuidField(),
});

// ── Schedule Override ──────────────────────────────────────────────────

export const updateScheduleSchema = z.object({
  id: uuidField(),
  shiftTypeId: uuidField(),
  overrideReason: z.string().trim().max(500).optional(),
});

// ── Apply Pattern ──────────────────────────────────────────────────────

export const applyPatternSchema = z.object({
  fromDate: z.string().min(1, "Start date is required"),
  toDate: z.string().min(1, "End date is required"),
  forceAll: z.boolean().default(false),
});

// ── Mark Day Off ───────────────────────────────────────────────────────

export const markDayOffSchema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().trim().min(1, "Name is required").max(200),
});

// ── Delete Holiday ─────────────────────────────────────────────────────

export const deleteHolidaySchema = z.object({
  id: uuidField(),
});

// ── Inferred types for react-hook-form ─────────────────────────────────

export type CreateShiftTypeInput = z.infer<typeof createShiftTypeSchema>;
export type UpdateShiftTypeInput = z.infer<typeof updateShiftTypeSchema>;
export type CreateRosterTemplateInput = z.infer<typeof createRosterTemplateSchema>;
export type CreateStaffAssignmentInput = z.infer<typeof createStaffAssignmentSchema>;
export type ApplyPatternInput = z.infer<typeof applyPatternSchema>;
export type MarkDayOffInput = z.infer<typeof markDayOffSchema>;
