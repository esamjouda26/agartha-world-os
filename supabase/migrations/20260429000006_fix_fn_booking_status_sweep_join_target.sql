-- =============================================================================
-- Fix fn_booking_status_sweep — invalid reference to UPDATE target in FROM JOIN
-- =============================================================================
-- The original definition in init_schema.sql:6900-6910 contained a
-- CHECKED_IN → COMPLETED transition that referenced the UPDATE target
-- table `b` inside another FROM-clause table's JOIN condition:
--
--     UPDATE public.bookings b
--        SET status = 'completed', updated_at = NOW()
--       FROM public.time_slots ts
--       JOIN public.tiers t ON t.id = b.tier_id           -- ← invalid
--      WHERE b.time_slot_id = ts.id
--        AND b.status = 'checked_in'
--        AND (ts.slot_date + ts.start_time + (t.duration_minutes ...)) < v_now
--
-- PostgreSQL rejects this because the UPDATE target (`b`) is not visible
-- to the JOIN ON clause of tables in the FROM list — it's only visible
-- in WHERE. Error:
--
--     ERROR: invalid reference to FROM-clause entry for table "b"
--     DETAIL: There is an entry for table "b", but it cannot be
--             referenced from this part of the query.
--     CONTEXT: PL/pgSQL function public.fn_booking_status_sweep() line 6
--
-- Effect: the daily `booking-status-sweep` cron at 15:30 UTC has been
-- failing for 12 consecutive days. Bookings remain stuck in `checked_in`
-- (or `confirmed` past their slot end) instead of auto-transitioning to
-- `completed`/`no_show`. Confirmed via cron.job_run_details.
--
-- Fix: flatten to cross-join with WHERE-clause join predicates. Both
-- `ts` and `t` go in the FROM list; join conditions move to WHERE,
-- where the target `b` is fully visible. Same logical query, valid
-- syntax. The first UPDATE (no_show transition) had no JOIN and is
-- preserved unchanged.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_booking_status_sweep()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_no_show_count   INTEGER;
    v_completed_count INTEGER;
    v_now             TIMESTAMPTZ := NOW() AT TIME ZONE public.get_app_config('facility_timezone');
BEGIN
    -- 1. confirmed bookings whose slot end has passed → no_show
    UPDATE public.bookings b
       SET status     = 'no_show',
           updated_at = NOW()
      FROM public.time_slots ts
     WHERE b.time_slot_id = ts.id
       AND b.status = 'confirmed'
       AND (ts.slot_date + ts.end_time) < v_now;
    GET DIAGNOSTICS v_no_show_count = ROW_COUNT;

    -- 2. checked_in bookings whose tier-duration window has elapsed → completed
    -- FIX: tiers `t` moved out of JOIN ... ON (which can't reference target
    -- table `b`) into the FROM list, with the join predicate in WHERE.
    UPDATE public.bookings b
       SET status     = 'completed',
           updated_at = NOW()
      FROM public.time_slots ts,
           public.tiers t
     WHERE b.time_slot_id = ts.id
       AND b.tier_id      = t.id
       AND b.status = 'checked_in'
       AND (ts.slot_date + ts.start_time + (t.duration_minutes || ' minutes')::INTERVAL) < v_now;
    GET DIAGNOSTICS v_completed_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'no_show_count',   v_no_show_count,
        'completed_count', v_completed_count
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_booking_status_sweep() FROM PUBLIC, anon, authenticated;
