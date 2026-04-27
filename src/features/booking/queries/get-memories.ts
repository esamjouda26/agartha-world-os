import "server-only";

import { cache } from "react";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readGuestSession } from "@/lib/auth/guest-session";
import type { Database } from "@/types/database";

/**
 * RSC fetcher for /my-booking/manage/memories.
 *
 * - Reads `captured_photos` for the cookie-bound booking, joined with the
 *   matched attendee's nickname / type / index.
 * - Generates a signed URL per photo with a 15-minute TTL (per Session 17
 *   prompt NOTES line + frontend_spec.md storage-bucket policy).
 * - Paginates server-side; the page passes ?page=N via nuqs.
 *
 * Service-role required to:
 *   1. Read the photo rows (RLS deny-by-default for guests; the cookie
 *      session is the auth, not auth.uid()).
 *   2. Sign storage URLs without exposing the bucket path to anonymous
 *      clients.
 */

export const PHOTOS_PER_PAGE = 24;
const SIGNED_URL_TTL_SECONDS = 60 * 15;
const STORAGE_BUCKET = "operations";

export type MemoryAttendee = Readonly<{
  attendee_type: "adult" | "child";
  attendee_index: number;
  nickname: string | null;
}>;

export type MemoryPhoto = Readonly<{
  id: string;
  captured_at: string;
  expires_at: string;
  /** Time-limited (15 min) signed URL or null when signing failed. */
  signed_url: string | null;
  attendee: MemoryAttendee | null;
}>;

export type MemoriesContext = Readonly<{
  booking: Readonly<{
    booking_ref: string;
    status: Database["public"]["Enums"]["booking_status"];
    /** YYYY-MM-DD of the booked slot. */
    slot_date: string;
    /** Whether any attendee was set up for auto-capture. */
    any_auto_capture_enabled: boolean;
  }>;
  total: number;
  page: number;
  page_size: number;
  photos: readonly MemoryPhoto[];
  /** TTL of every signed URL on this page — surfaced in the share toast copy. */
  signed_url_ttl_seconds: number;
}>;

type Page = Readonly<{ page: number }>;

/**
 * `cache()` keys the dedup table on the argument list, so passing the page
 * lets us safely call this query per page in the same render. Defaults to
 * page 1.
 */
export const getMemories = cache(
  async ({ page = 1 }: Page = { page: 1 }): Promise<MemoriesContext | null> => {
    const sessionRef = await readGuestSession();
    if (!sessionRef) return null;

    const supabase = createSupabaseServiceClient();

    // Resolve booking by cookie ref.
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, booking_ref, status, time_slot_id")
      .eq("booking_ref", sessionRef)
      .maybeSingle();
    if (bookingError || !booking) return null;

    // Slot date — needed for the page header.
    const { data: slot } = await supabase
      .from("time_slots")
      .select("slot_date")
      .eq("id", booking.time_slot_id)
      .maybeSingle();

    // Whether any attendee was opted into auto-capture (drives the empty-state copy).
    const { data: attendeeFlags } = await supabase
      .from("booking_attendees")
      .select("auto_capture_enabled")
      .eq("booking_id", booking.id);
    const anyAutoCapture = (attendeeFlags ?? []).some((row) => row.auto_capture_enabled === true);

    // Total + paginated rows.
    const { count: totalCount } = await supabase
      .from("captured_photos")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", booking.id);
    const total = totalCount ?? 0;

    // Clamp the page to [1, totalPages] so a stray ?page=999 in the URL
    // can't strand the user on an empty page with no clear way back. We
    // still emit the (clamped) page in the returned context so pagination
    // links render correctly.
    const totalPages = Math.max(1, Math.ceil(total / PHOTOS_PER_PAGE));
    const requested = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePage = total === 0 ? 1 : Math.min(requested, totalPages);
    const offset = (safePage - 1) * PHOTOS_PER_PAGE;

    const { data: photoRows } = await supabase
      .from("captured_photos")
      .select(
        "id, captured_at, expires_at, storage_path, attendee:booking_attendees ( attendee_type, attendee_index, nickname )",
      )
      .eq("booking_id", booking.id)
      .order("captured_at", { ascending: false })
      .range(offset, offset + PHOTOS_PER_PAGE - 1);

    // Sign URLs in parallel — Storage createSignedUrl batches well in the
    // network round-trip. We tolerate per-photo signing failures by
    // returning null for the URL; the card renders a placeholder + a
    // "could not load" hint.
    const photos: readonly MemoryPhoto[] = await Promise.all(
      (photoRows ?? []).map(async (row) => {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
        const matched = Array.isArray(row.attendee) ? row.attendee[0] : row.attendee;
        const attendee: MemoryAttendee | null = matched
          ? {
              attendee_type: matched.attendee_type as "adult" | "child",
              attendee_index: matched.attendee_index,
              nickname: matched.nickname,
            }
          : null;
        return {
          id: row.id,
          captured_at: row.captured_at,
          expires_at: row.expires_at,
          signed_url: error || !data?.signedUrl ? null : data.signedUrl,
          attendee,
        };
      }),
    );

    return {
      booking: {
        booking_ref: booking.booking_ref,
        status: (booking.status ??
          "pending_payment") as Database["public"]["Enums"]["booking_status"],
        slot_date: slot?.slot_date ?? "",
        any_auto_capture_enabled: anyAutoCapture,
      },
      total,
      page: safePage,
      page_size: PHOTOS_PER_PAGE,
      photos,
      signed_url_ttl_seconds: SIGNED_URL_TTL_SECONDS,
    };
  },
);
