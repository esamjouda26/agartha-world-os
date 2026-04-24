import { z } from "zod";

const uuid = z.guid();

export const createUnitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  abbreviation: z.string().min(1, "Abbreviation is required").max(20),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = z.object({
  id: uuid,
  name: z.string().min(1, "Name is required").max(100),
  abbreviation: z.string().min(1, "Abbreviation is required").max(20),
});
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
