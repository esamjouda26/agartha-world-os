-- =============================================================================
-- Fix rpc_create_booking — remove invalid FOR SHARE on aggregate query
-- =============================================================================
-- PostgreSQL forbids FOR SHARE / FOR UPDATE row-locking clauses on queries
-- that include aggregate functions (SUM, COUNT, etc.) — aggregation collapses
-- multiple physical rows into a single derived row, so there's nothing
-- specific to lock. The original definition in init_schema.sql:5400-5405
-- combined SUM(b.adult_count + b.child_count) with FOR SHARE OF b, which
-- raised SQLSTATE 0A000 ("FOR SHARE is not allowed with aggregate functions")
-- on every booking attempt.
--
-- The intended invariant — that no concurrent booking can sneak past the
-- facility-overlap capacity check — is already enforced one statement
-- earlier by `SELECT * FROM public.time_slots ... FOR UPDATE` (init_schema.
-- sql:5389), which serializes concurrent booking attempts on the same slot
-- via the row lock on time_slots. The redundant FOR SHARE OF b on the
-- bookings aggregate added no extra protection — only the bug.
--
-- This is the same shape as rpc_modify_booking (init_schema.sql:5552-5556),
-- which performs the identical facility-overlap check WITHOUT FOR SHARE
-- and has been working correctly all along.
--
-- Cloud impact: function body is REPLACEd; existing function signature is
-- preserved so callers (Server Actions, RPC client) require no changes.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_create_booking(
    p_experience_id UUID, p_time_slot_id UUID, p_tier_id UUID,
    p_booker_name TEXT, p_booker_email TEXT, p_booker_phone TEXT,
    p_adult_count INT, p_child_count INT, p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_slot RECORD; v_tier RECORD; v_experience RECORD;
    v_effective_capacity INT; v_total_guests INT; v_total_price NUMERIC;
    v_booking_ref TEXT; v_qr_ref TEXT; v_booking_id UUID;
    v_promo_id UUID := NULL; v_discount NUMERIC := 0; v_result JSONB;
    v_new_checkin TIME; v_new_checkout TIME; v_overlapping_guests INT; v_promo_rec RECORD;
BEGIN
    v_total_guests := p_adult_count + p_child_count;
    SELECT * INTO v_experience FROM public.experiences WHERE id = p_experience_id;
    IF v_experience IS NULL THEN RAISE EXCEPTION 'EXPERIENCE_NOT_FOUND'; END IF;
    SELECT * INTO v_slot FROM public.time_slots WHERE id = p_time_slot_id AND experience_id = p_experience_id FOR UPDATE;
    IF v_slot IS NULL THEN RAISE EXCEPTION 'TIME_SLOT_NOT_FOUND'; END IF;
    v_effective_capacity := COALESCE(v_slot.override_capacity, v_experience.capacity_per_slot);
    IF (v_slot.booked_count + v_total_guests) > v_effective_capacity THEN RAISE EXCEPTION 'SLOT_FULL'; END IF;

    SELECT t.* INTO v_tier FROM public.experience_tiers et JOIN public.tiers t ON t.id = et.tier_id
    WHERE et.experience_id = p_experience_id AND et.tier_id = p_tier_id;
    IF v_tier IS NULL THEN RAISE EXCEPTION 'TIER_NOT_FOUND'; END IF;

    v_new_checkin := v_slot.start_time;
    v_new_checkout := v_slot.start_time + (v_tier.duration_minutes || ' minutes')::INTERVAL;
    -- FIX: removed `FOR SHARE OF b` — invalid on aggregate; serialization is
    -- already enforced by FOR UPDATE on time_slots above.
    SELECT COALESCE(SUM(b.adult_count + b.child_count), 0) INTO v_overlapping_guests
    FROM public.bookings b JOIN public.time_slots ts ON ts.id = b.time_slot_id JOIN public.tiers t ON t.id = b.tier_id
    WHERE b.experience_id = p_experience_id AND b.status IN ('pending_payment', 'confirmed', 'checked_in', 'completed')
      AND ts.slot_date = v_slot.slot_date AND ts.start_time < v_new_checkout
      AND (ts.start_time + (t.duration_minutes || ' minutes')::INTERVAL) > v_new_checkin;
    IF (v_overlapping_guests + v_total_guests) > v_experience.max_facility_capacity THEN RAISE EXCEPTION 'FACILITY_AT_CAPACITY'; END IF;

    v_total_price := (v_tier.adult_price * p_adult_count) + (v_tier.child_price * p_child_count);

    IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
        SELECT * INTO v_promo_rec FROM public.promo_codes WHERE code = upper(p_promo_code) FOR UPDATE;
        IF v_promo_rec IS NULL THEN RAISE EXCEPTION 'PROMO_NOT_FOUND'; END IF;
        IF v_promo_rec.status != 'active' THEN RAISE EXCEPTION 'PROMO_INACTIVE'; END IF;
        IF NOT (now() BETWEEN v_promo_rec.valid_from AND v_promo_rec.valid_to) THEN RAISE EXCEPTION 'PROMO_EXPIRED'; END IF;
        IF v_promo_rec.current_uses >= v_promo_rec.max_uses THEN RAISE EXCEPTION 'PROMO_MAX_USES_REACHED'; END IF;
        IF v_promo_rec.min_group_size > v_total_guests THEN RAISE EXCEPTION 'PROMO_GROUP_TOO_SMALL'; END IF;
        IF EXISTS (SELECT 1 FROM public.promo_valid_tiers WHERE promo_code_id = v_promo_rec.id)
           AND NOT EXISTS (SELECT 1 FROM public.promo_valid_tiers WHERE promo_code_id = v_promo_rec.id AND tier_id = p_tier_id) THEN RAISE EXCEPTION 'PROMO_TIER_MISMATCH'; END IF;
        IF v_promo_rec.valid_days_mask IS NOT NULL AND (v_promo_rec.valid_days_mask & (1 << (EXTRACT(ISODOW FROM v_slot.slot_date)::INT - 1))) = 0 THEN RAISE EXCEPTION 'PROMO_DAY_INVALID'; END IF;
        IF v_promo_rec.valid_time_start IS NOT NULL AND NOT (v_slot.start_time >= v_promo_rec.valid_time_start AND v_slot.start_time < COALESCE(v_promo_rec.valid_time_end, '23:59'::TIME)) THEN RAISE EXCEPTION 'PROMO_TIME_INVALID'; END IF;
        IF v_promo_rec.campaign_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = v_promo_rec.campaign_id AND c.status = 'active') THEN
                RAISE EXCEPTION 'PROMO_CAMPAIGN_INACTIVE';
            END IF;
        END IF;

        v_promo_id := v_promo_rec.id;
        SELECT CASE v_promo_rec.discount_type WHEN 'percentage' THEN v_total_price * (v_promo_rec.discount_value / 100.0) WHEN 'fixed' THEN LEAST(v_promo_rec.discount_value, v_total_price) ELSE 0 END INTO v_discount;
        v_total_price := GREATEST(0, v_total_price - v_discount);
        UPDATE public.promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo_id;
    END IF;

    v_booking_ref := 'AG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)) || '-' || lpad(floor(extract(epoch from now()) * 100 % 10000)::text, 4, '0');
    v_qr_ref := 'AGARTHA:' || v_tier.name || ':' || v_total_guests || ':' || extract(epoch from now())::text;

    INSERT INTO public.bookings (experience_id, time_slot_id, tier_id, status, total_price, booking_ref, booker_email, booker_name, booker_phone, adult_count, child_count, qr_code_ref, promo_code_id)
    VALUES (p_experience_id, p_time_slot_id, p_tier_id, 'pending_payment', v_total_price, v_booking_ref, lower(p_booker_email), p_booker_name, p_booker_phone, p_adult_count, p_child_count, v_qr_ref, v_promo_id)
    RETURNING id INTO v_booking_id;

    UPDATE public.time_slots SET booked_count = booked_count + v_total_guests, updated_at = now() WHERE id = p_time_slot_id;

    FOR i IN 1..p_adult_count LOOP
        INSERT INTO public.booking_attendees (booking_id, attendee_type, attendee_index, face_pay_enabled, auto_capture_enabled) VALUES (v_booking_id, 'adult', i, FALSE, FALSE);
    END LOOP;
    FOR i IN 1..p_child_count LOOP
        INSERT INTO public.booking_attendees (booking_id, attendee_type, attendee_index, face_pay_enabled, auto_capture_enabled) VALUES (v_booking_id, 'child', i, FALSE, FALSE);
    END LOOP;

    INSERT INTO public.booking_payments (booking_id, method, amount, status) VALUES (v_booking_id, 'card', v_total_price, 'pending');

    SELECT jsonb_build_object('booking_id', v_booking_id, 'booking_ref', v_booking_ref, 'qr_code_ref', v_qr_ref, 'tier_name', v_tier.name, 'total_price', v_total_price, 'adult_count', p_adult_count, 'child_count', p_child_count, 'slot_date', v_slot.slot_date, 'start_time', v_slot.start_time, 'status', 'pending_payment', 'discount_applied', v_discount) INTO v_result;
    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_create_booking FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_booking TO authenticated;
