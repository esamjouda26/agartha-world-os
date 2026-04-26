import { z } from "zod";

export const CONSTRAINT_TYPES = [
  "maintenance",
  "private_event",
  "safety_incident",
  "weather",
  "staffing",
  "other",
] as const;

export type ConstraintType = (typeof CONSTRAINT_TYPES)[number];

export const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  maintenance: "Maintenance",
  private_event: "Private Event",
  safety_incident: "Safety Incident",
  weather: "Weather",
  staffing: "Staffing",
  other: "Other",
};

export const editSlotSchema = z.object({
  slotId: z.string().uuid(),
  overrideCapacity: z.number().int().min(0, "Must be >= 0"),
  constraintType: z.enum(CONSTRAINT_TYPES).nullable().default(null),
  constraintNotes: z.string().max(500).nullable().default(null),
});

export type EditSlotInput = z.infer<typeof editSlotSchema>;
