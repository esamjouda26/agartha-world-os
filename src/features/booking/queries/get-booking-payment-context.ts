import "server-only";

import { cache } from "react";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

/**
 * /book/payment + /my-booking/manage data fetcher (booking-by-ref).
 *
 * We use the service-role client because:
 *   - `bookings` and `booking_payments` are NOT anon-readable (no _select_anon
 *     RLS policies — see init_schema.sql §10b RLS block at line 3417+).
 *   - `rpc_get_booking_by_ref` exists but is REVOKE'd from anon (init_schema.sql:5476-5477).
 *   - The route's IDOR guard lives upstream in page.tsx: cookie + URL param
 *     must agree before this fetcher is called.
 *
 * Wrapped in `cache()` so a single render tree dedups the read across the
 * page + status display + summary aside.
 */

export type BookingPaymentContext = Readonly<{
  booking: Readonly<{
    id: string;
    booking_ref: string;
    status: Database["public"]["Enums"]["booking_status"];
    total_price: number;
    qr_code_ref: string | null;
    booker_name: string;
    booker_email: string;
    adult_count: number;
    child_count: number;
    cancelled_at: string | null;
    /** When the booking was created — drives the 15-min hold countdown. */
    created_at: string;
  }>;
  payment: Readonly<{
    id: string;
    amount: number;
    currency: string;
    status: Database["public"]["Enums"]["payment_status"];
    paid_at: string | null;
    payment_intent_id: string | null;
  }> | null;
  experience: Readonly<{ name: string }>;
  tier: Readonly<{
    name: string;
    duration_minutes: number;
    adult_price: number;
    child_price: number;
  }>;
  slot: Readonly<{ slot_date: string; start_time: string; end_time: string }>;
}>;

export const getBookingPaymentContext = cache(
  async (bookingRef: string): Promise<BookingPaymentContext | null> => {
    const supabase = createSupabaseServiceClient();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, booking_ref, status, total_price, qr_code_ref, booker_name, booker_email, adult_count, child_count, cancelled_at, created_at, tier_id, time_slot_id, experience_id",
      )
      .eq("booking_ref", bookingRef.toUpperCase())
      // .maybeSingle() — invalid refs return null instead of throwing.
      .maybeSingle();

    if (bookingError || !booking) return null;

    const [paymentRes, experienceRes, tierRes, slotRes] = await Promise.all([
      supabase
        .from("booking_payments")
        .select("id, amount, currency, status, paid_at, payment_intent_id")
        .eq("booking_id", booking.id)
        // Take the most recent payment row — Phase 9b retries may insert
        // additional rows when a new payment_intent_id is generated.
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("experiences").select("name").eq("id", booking.experience_id).maybeSingle(),
      supabase
        .from("tiers")
        .select("name, duration_minutes, adult_price, child_price")
        .eq("id", booking.tier_id)
        .maybeSingle(),
      supabase
        .from("time_slots")
        .select("slot_date, start_time, end_time")
        .eq("id", booking.time_slot_id)
        .maybeSingle(),
    ]);

    if (!experienceRes.data || !tierRes.data || !slotRes.data) return null;

    return {
      booking: {
        id: booking.id,
        booking_ref: booking.booking_ref,
        status: (booking.status ??
          "pending_payment") as Database["public"]["Enums"]["booking_status"],
        total_price: Number(booking.total_price),
        qr_code_ref: booking.qr_code_ref,
        booker_name: booking.booker_name,
        booker_email: booking.booker_email,
        adult_count: booking.adult_count ?? 0,
        child_count: booking.child_count ?? 0,
        cancelled_at: booking.cancelled_at,
        created_at: booking.created_at,
      },
      payment: paymentRes.data
        ? {
            id: paymentRes.data.id,
            amount: Number(paymentRes.data.amount),
            currency: paymentRes.data.currency ?? "MYR",
            status: (paymentRes.data.status ??
              "pending") as Database["public"]["Enums"]["payment_status"],
            paid_at: paymentRes.data.paid_at,
            payment_intent_id: paymentRes.data.payment_intent_id,
          }
        : null,
      experience: { name: experienceRes.data.name },
      tier: {
        name: tierRes.data.name,
        duration_minutes: tierRes.data.duration_minutes,
        adult_price: Number(tierRes.data.adult_price),
        child_price: Number(tierRes.data.child_price),
      },
      slot: {
        slot_date: slotRes.data.slot_date,
        start_time: slotRes.data.start_time,
        end_time: slotRes.data.end_time,
      },
    };
  },
);
