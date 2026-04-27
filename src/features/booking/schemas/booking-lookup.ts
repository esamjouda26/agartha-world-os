import { z } from "zod";

/**
 * Schema for the /my-booking lookup form.
 *
 * `booking_ref` matches the format minted by `rpc_create_booking`
 * (init_schema.sql:5433): 'AG-' + 6 hex chars + '-' + 4 timestamp digits.
 * We accept any case from the user and uppercase before sending so the
 * RPC's `WHERE booking_ref = upper(p_booking_ref)` lookup hits regardless
 * of how the guest typed it.
 */

export const BOOKING_REF_REGEX = /^AG-[A-F0-9]{6}-\d{4}$/;

export const bookingLookupSchema = z.object({
  booking_ref: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      BOOKING_REF_REGEX,
      "Booking refs look like AG-A1B2C3-1234 — please check your confirmation email.",
    ),
});

export type BookingLookupInput = z.infer<typeof bookingLookupSchema>;
