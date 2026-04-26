/**
 * Booking domain types for entry-validation.
 * RPC return shapes are defined inline because the RPCs return composite JSON,
 * not table rows directly (no generated type in database.ts).
 */

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "no_show";

/**
 * Shape of `rpc_lookup_booking` (init_schema.sql:5600). Field names align
 * with the RPC's jsonb_build_object output — DO NOT rename without an
 * accompanying RPC migration.
 */
export type BookingLookupResult = Readonly<{
  booking_id: string;
  booking_ref: string;
  status: BookingStatus;
  experience_name: string;
  tier_name: string;
  tier_duration_minutes: number;
  arrival_window_minutes: number;
  slot_date: string;
  start_time: string;
  adult_count: number;
  child_count: number;
  booker_name: string;
  total_price: number;
  checked_in_at: string | null;
}>;

/**
 * Shape of one row returned by `rpc_search_bookings_by_email`
 * (init_schema.sql:5608) — field names match the jsonb_build_object output.
 */
export type BookingSearchResult = Readonly<{
  booking_id: string;
  booking_ref: string;
  status: BookingStatus;
  booker_name: string;
  adult_count: number;
  child_count: number;
  tier_name: string;
  slot_date: string;
  start_time: string;
  checked_in_at: string | null;
  experience_name?: string;
}>;
