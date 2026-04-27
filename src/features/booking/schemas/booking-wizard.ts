import { z } from "zod";

/**
 * Zod schemas for the public booking wizard.
 *
 * Param shapes mirror the migration RPC signatures verbatim:
 *   - rpc_get_available_slots  → init_schema.sql:5268
 *   - rpc_validate_promo_code  → init_schema.sql:5325
 *   - rpc_create_booking       → init_schema.sql:5371
 *
 * UUIDs use z.guid() (Zod 4) per memory note "Zod UUID trap" — z.string().uuid()
 * incorrectly rejects seeded version-0 nibbles.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const isoTime = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM[:SS] format");

const adultCount = z
  .number()
  .int()
  .min(1, "At least 1 adult is required")
  .max(50, "For groups over 50 contact us directly");

const childCount = z.number().int().min(0).max(50);

export const getAvailableSlotsSchema = z.object({
  p_experience_id: z.guid("Invalid experience"),
  p_date: isoDate,
  p_tier_id: z.guid("Invalid tier"),
  p_guest_count: z.number().int().min(1).max(100),
});
export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsSchema>;

export const validatePromoCodeSchema = z.object({
  p_promo_code: z
    .string()
    .trim()
    .min(2, "Promo code is too short")
    .max(40, "Promo code is too long")
    .transform((s) => s.toUpperCase()),
  p_tier_id: z.guid("Invalid tier"),
  p_slot_date: isoDate,
  p_slot_start_time: isoTime,
  p_adult_count: adultCount,
  p_child_count: childCount,
});
export type ValidatePromoCodeInput = z.infer<typeof validatePromoCodeSchema>;

/**
 * Booker details — name + email + phone + T&Cs acceptance.
 *
 * Promo code is intentionally OUT of this schema: it has its own debounced
 * live-validating <PromoCodeInput> sibling on the same step, owned by the
 * wizard's local state. Mixing it into the RHF form would force every
 * keystroke through full schema revalidation and create cross-controlled
 * state with the live preview.
 */
export const bookerDetailsSchema = z.object({
  booker_name: z.string().trim().min(2, "Please enter your full name").max(120, "Name is too long"),
  booker_email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  booker_phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long")
    .regex(/^[+0-9 ()-]+$/, "Phone number contains invalid characters"),
  accept_terms: z
    .boolean()
    .refine((v) => v === true, "You must accept the Terms & Conditions to continue"),
});
export type BookerDetailsInput = z.infer<typeof bookerDetailsSchema>;

/**
 * Full create-booking input — combines wizard state with booker details.
 *
 * `p_promo_code` is `.optional()` so the spread at the call site can omit
 * the property entirely when no promo applies. The exactOptionalPropertyTypes
 * flag means callers MUST avoid passing `p_promo_code: undefined` — use
 * `...(promo ? { p_promo_code: promo } : {})` instead.
 */
export const createBookingSchema = z.object({
  p_experience_id: z.guid("Invalid experience"),
  p_time_slot_id: z.guid("Invalid time slot"),
  p_tier_id: z.guid("Invalid tier"),
  p_booker_name: bookerDetailsSchema.shape.booker_name,
  p_booker_email: bookerDetailsSchema.shape.booker_email,
  p_booker_phone: bookerDetailsSchema.shape.booker_phone,
  p_adult_count: adultCount,
  p_child_count: childCount,
  p_promo_code: z.string().trim().max(40).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
