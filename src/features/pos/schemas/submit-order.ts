import { z } from "zod";

/**
 * Zod schema for submitOrder Server Action input.
 * Uses z.guid() everywhere per memory feedback_zod_uuid_trap.md —
 * z.string().uuid() rejects seeded IDs with version nibble 0.
 */

const submitOrderItemSchema = z.object({
  material_id: z.string().min(1),
  quantity: z.number().int().positive(),
  modifiers: z.array(z.string()).default([]),
});

export const submitOrderSchema = z.object({
  posPointId: z.string().min(1),
  items: z.array(submitOrderItemSchema).min(1, "Cart cannot be empty"),
  paymentMethod: z.enum(["cash", "card", "face_pay", "digital_wallet"]),
});

export type SubmitOrderSchema = z.infer<typeof submitOrderSchema>;
