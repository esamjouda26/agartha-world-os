-- =============================================================================
-- Migration: case-insensitive booking_ref lookup
-- =============================================================================
-- Fixes a casing mismatch between two booking_ref producers:
--
--   * `seed.sql:574` builds refs from `MD5()` which returns LOWERCASE hex,
--     so seeded rows look like `AG-c4ca42-0001`.
--   * `rpc_create_booking` (init_schema.sql:5433) wraps the random part in
--     `upper(...)`, so app-created refs look like `AG-C4CA42-0001`.
--
-- The original `rpc_lookup_booking` did
--   `WHERE booking_ref = upper(p_booking_ref)`
-- which uppercases the user's input — fine for new bookings, but every
-- seed row becomes unreachable. Crew at /crew/entry-validation copying a
-- ref straight off the bookings table would always get BOOKING_NOT_FOUND.
--
-- Replace the lookup with a symmetric `upper(booking_ref) = upper(...)`
-- so both legacy seeded rows and freshly-created refs resolve. Add a
-- functional B-tree index on `upper(booking_ref)` so the lookup stays an
-- index seek, not a sequential scan as the bookings table grows.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_lookup_booking(
    p_qr_code_ref TEXT DEFAULT NULL,
    p_booking_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_booking RECORD;
    v_slot RECORD;
    v_tier RECORD;
    v_experience RECORD;
BEGIN
    IF p_qr_code_ref IS NOT NULL THEN
        SELECT * INTO v_booking
          FROM public.bookings
         WHERE qr_code_ref = p_qr_code_ref;
    ELSIF p_booking_ref IS NOT NULL THEN
        -- Case-insensitive on both sides so seeded (lowercase hex) and
        -- app-created (uppercase hex) refs both resolve. The companion
        -- functional index `idx_bookings_booking_ref_upper` keeps the
        -- comparison sargable.
        SELECT * INTO v_booking
          FROM public.bookings
         WHERE upper(booking_ref) = upper(p_booking_ref);
    ELSE
        RAISE EXCEPTION 'PROVIDE_QR_OR_REF';
    END IF;

    IF v_booking IS NULL THEN
        RAISE EXCEPTION 'BOOKING_NOT_FOUND';
    END IF;

    SELECT * INTO v_slot       FROM public.time_slots  WHERE id = v_booking.time_slot_id;
    SELECT * INTO v_tier       FROM public.tiers       WHERE id = v_booking.tier_id;
    SELECT * INTO v_experience FROM public.experiences WHERE id = v_booking.experience_id;

    RETURN jsonb_build_object(
        'booking_id',             v_booking.id,
        'booking_ref',            v_booking.booking_ref,
        'status',                 v_booking.status,
        'booker_name',            v_booking.booker_name,
        'adult_count',            v_booking.adult_count,
        'child_count',            v_booking.child_count,
        'total_price',            v_booking.total_price,
        'tier_name',              v_tier.name,
        'tier_duration_minutes',  v_tier.duration_minutes,
        'experience_name',        v_experience.name,
        'arrival_window_minutes', v_experience.arrival_window_minutes,
        'slot_date',              v_slot.slot_date,
        'start_time',             v_slot.start_time,
        'checked_in_at',          v_booking.checked_in_at
    );
END;
$$;

-- Functional index keeps the case-insensitive lookup an O(log n) index
-- seek. Without it the planner falls back to a Seq Scan on bookings,
-- which scales poorly at production volumes.
CREATE INDEX IF NOT EXISTS idx_bookings_booking_ref_upper
    ON public.bookings (upper(booking_ref));

COMMENT ON FUNCTION public.rpc_lookup_booking(TEXT, TEXT)
    IS 'Case-insensitive booking lookup by QR code (exact) or booking ref (upper-folded). See migration 20260429000000 for the casing-mismatch backstory.';
