/**
 * Booking domain types for entry-validation.
 * RPC return shapes are defined inline because the RPCs return composite JSON,
 * not table rows directly (no generated type in database.ts).
 */

export type BookingStatus = "pending_payment" | "confirmed" | "checked_in" | "completed" | "no_show";

export type BookingLookupResult = Readonly<{
  booking_id: string;
  booking_ref: string;
  status: BookingStatus;
  experience_name: string;
  tier_name: string;
  slot_date: string;
  slot_start_time: string;
  slot_end_time: string;
  adult_count: number;
  child_count: number;
  booker_name: string;
  booker_email: string;
  checked_in_at: string | null;
}>;

export type BookingSearchResult = Readonly<{
  booking_id: string;
  booking_ref: string;
  status: BookingStatus;
  slot_date: string;
  slot_start_time: string;
  experience_name: string;
}>;
