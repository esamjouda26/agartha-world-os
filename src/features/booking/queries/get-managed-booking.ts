import "server-only";

import { cache } from "react";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readGuestSession } from "@/lib/auth/guest-session";
import type { Database } from "@/types/database";

/**
 * RSC fetcher for /my-booking/manage and its sub-routes.
 *
 * Resolves the booking_ref from the OTP-signed `guest_session` cookie,
 * then calls `rpc_get_booking_by_ref` (init_schema.sql:5460) via the
 * service-role client because the RPC is REVOKE'd from anon.
 *
 * Returns null when:
 *   - The session cookie is missing/expired/tampered (caller redirects)
 *   - The RPC reports BOOKING_NOT_FOUND (caller renders an error state)
 *
 * Wrapped in `cache()` so a single render tree (page + ticket hero +
 * attendee list + reschedule sheet) hits the DB once per request.
 */

export type ManagedAttendee = Readonly<{
  id: string;
  attendee_type: "adult" | "child";
  attendee_index: number;
  nickname: string | null;
  face_pay_enabled: boolean;
  auto_capture_enabled: boolean;
  has_biometric: boolean;
}>;

export type ManagedBooking = Readonly<{
  id: string;
  booking_ref: string;
  status: Database["public"]["Enums"]["booking_status"];
  tier_name: string;
  total_price: number;
  booker_name: string;
  booker_email: string;
  adult_count: number;
  child_count: number;
  qr_code_ref: string;
  checked_in_at: string | null;
  slot_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  perks: readonly string[];
  attendees: readonly ManagedAttendee[];
  /** FK ids needed by the reschedule sheet — fetched alongside the RPC result. */
  experience_id: string;
  tier_id: string;
  time_slot_id: string;
}>;

export const getManagedBooking = cache(async (): Promise<ManagedBooking | null> => {
  const sessionRef = await readGuestSession();
  if (!sessionRef) return null;

  const supabase = createSupabaseServiceClient();
  const [rpcRes, fkRes] = await Promise.all([
    supabase.rpc("rpc_get_booking_by_ref", { p_booking_ref: sessionRef }),
    // The RPC return omits FK ids (it serialises display-friendly names),
    // so we read them in parallel for the reschedule sheet.
    supabase
      .from("bookings")
      .select("experience_id, tier_id, time_slot_id")
      .eq("booking_ref", sessionRef.toUpperCase())
      .maybeSingle(),
  ]);

  const { data, error } = rpcRes;
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return null;
  if (!fkRes.data) return null;

  // Narrow the JSONB return — shape asserted by the RPC body
  // (init_schema.sql:5471-5472). We trust the RPC's jsonb_build_object
  // since this is service-role + cookie-bound. `as unknown` indirection
  // satisfies the strict-cast rule under the wide-Json input type.
  const raw = data as unknown as {
    id: string;
    booking_ref: string;
    status: Database["public"]["Enums"]["booking_status"];
    tier_name: string;
    total_price: number | string;
    booker_name: string;
    booker_email: string;
    adult_count: number;
    child_count: number;
    qr_code_ref: string;
    checked_in_at: string | null;
    slot_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    perks: readonly string[];
    attendees: readonly ManagedAttendee[];
  };

  return {
    id: raw.id,
    booking_ref: raw.booking_ref,
    status: raw.status,
    tier_name: raw.tier_name,
    total_price: Number(raw.total_price),
    booker_name: raw.booker_name,
    booker_email: raw.booker_email,
    adult_count: raw.adult_count,
    child_count: raw.child_count,
    qr_code_ref: raw.qr_code_ref,
    checked_in_at: raw.checked_in_at,
    slot_date: raw.slot_date,
    start_time: raw.start_time,
    end_time: raw.end_time,
    duration_minutes: raw.duration_minutes,
    perks: raw.perks,
    attendees: raw.attendees,
    experience_id: fkRes.data.experience_id,
    tier_id: fkRes.data.tier_id,
    time_slot_id: fkRes.data.time_slot_id,
  };
});

/**
 * Returns hours-until-slot, rounded to one decimal. Negative values mean
 * the slot has already started/passed. Used for the 2-hour reschedule
 * gate on the client + server.
 */
export function hoursUntilSlot(slotDate: string, startTime: string): number {
  const [y = "0", m = "0", d = "0"] = slotDate.split("-");
  const [h = "0", mi = "0"] = startTime.split(":");
  const target = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(mi)));
  // We're storing the wall-clock in facility tz; for a quick gate we
  // treat the date as if the user's machine is in the same tz. The RPC
  // is the authoritative gate (rejects RESCHEDULE_TOO_LATE) — the client
  // value is only for show/hide of the reschedule control.
  return (target.getTime() - Date.now()) / (1000 * 60 * 60);
}
