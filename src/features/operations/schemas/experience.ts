import { z } from "zod";

// ── Experience ────────────────────────────────────────────────────────

export const createExperienceSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  capacityPerSlot: z.number().int().positive("Must be > 0"),
  maxFacilityCapacity: z.number().int().positive("Must be > 0"),
  arrivalWindowMinutes: z.number().int().positive("Must be > 0").default(15),
  isActive: z.boolean().default(true),
});

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;

export const updateExperienceSchema = createExperienceSchema.extend({
  id: z.string().uuid(),
});

export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;

// ── Tier ──────────────────────────────────────────────────────────────

export const createTierSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  adultPrice: z.number().min(0, "Must be >= 0"),
  childPrice: z.number().min(0, "Must be >= 0"),
  durationMinutes: z.number().int().positive("Must be > 0"),
  sortOrder: z.number().int().default(0),
});

export type CreateTierInput = z.infer<typeof createTierSchema>;

export const updateTierSchema = createTierSchema.extend({
  id: z.string().uuid(),
});

export type UpdateTierInput = z.infer<typeof updateTierSchema>;

// ── Tier Perk ─────────────────────────────────────────────────────────

export const createTierPerkSchema = z.object({
  tierId: z.string().uuid(),
  perk: z.string().min(1, "Perk text required").max(300),
});

export type CreateTierPerkInput = z.infer<typeof createTierPerkSchema>;

// ── Scheduler Config ──────────────────────────────────────────────────

export const upsertSchedulerConfigSchema = z
  .object({
    experienceId: z.string().uuid(),
    daysAhead: z.number().int().min(1).max(90),
    dayStartHour: z.number().int().min(0).max(23),
    dayEndHour: z.number().int().min(1).max(24),
    startDate: z.string().min(1, "Start date required"),
    endDate: z.string().nullable().default(null),
  })
  .refine((d) => d.dayStartHour < d.dayEndHour, {
    message: "End hour must be after start hour",
    path: ["dayEndHour"],
  });

export type UpsertSchedulerConfigInput = z.infer<typeof upsertSchedulerConfigSchema>;

// ── Generate Slots ────────────────────────────────────────────────────

export const generateSlotsSchema = z.object({
  experienceId: z.string().uuid(),
  startDate: z.string().min(1, "Start date required"),
  days: z.number().int().min(1).max(90),
  slotIntervalMinutes: z.number().int().min(5).max(480).default(15),
  dayStartHour: z.number().int().min(0).max(23).default(9),
  dayEndHour: z.number().int().min(1).max(24).default(21),
});

export type GenerateSlotsInput = z.infer<typeof generateSlotsSchema>;
