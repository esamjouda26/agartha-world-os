-- =============================================================================
-- Phase 4 follow-up: staff self-service punch undo.
-- =============================================================================
-- Adds `rpc_void_own_punch(p_punch_id UUID)` so a crew member can undo an
-- accidental clock-in/clock-out within a short grace window. The underlying
-- columns `voided_at` + `voided_by` already exist on `public.timecard_punches`
-- (see init_schema.sql:1636). This RPC extends the enterprise-standard
-- "2-minute undo" pattern to a 1-hour grace window.
--
-- Constraints enforced in the RPC (matches init_schema.sql:5925-5965 style):
--   - Caller must own the punch (staff_record_id match).
--   - Punch must not already be voided.
--   - Punch must have been created within VOID_WINDOW_MINUTES of NOW().
--   - `is_claims_fresh()` guard prevents stale-JWT abuse.
--
-- Reversibility: this migration is additive (CREATE OR REPLACE FUNCTION + GRANT).
-- To rollback: `DROP FUNCTION public.rpc_void_own_punch(UUID);`.
-- =============================================================================

SET check_function_bodies = OFF;
SET client_min_messages = WARNING;
SET search_path = public, extensions;


CREATE OR REPLACE FUNCTION public.rpc_void_own_punch(p_punch_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_staff_record_id UUID;
    v_punch RECORD;
    -- Grace window for self-service undo. Enterprise norm (DingTalk,
    -- Deputy, When I Work) is 2-5 minutes, but configured to 1 hour here.
    -- HR/Admin can void outside this window via the existing update policy.
    v_void_window INTERVAL := INTERVAL '1 hour';
BEGIN
    IF NOT public.is_claims_fresh() THEN
        RAISE EXCEPTION 'STALE_JWT';
    END IF;

    SELECT p.staff_record_id INTO v_staff_record_id
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid());
    IF v_staff_record_id IS NULL THEN
        RAISE EXCEPTION 'STAFF_RECORD_NOT_LINKED';
    END IF;

    SELECT * INTO v_punch
    FROM public.timecard_punches tp
    WHERE tp.id = p_punch_id
      AND tp.staff_record_id = v_staff_record_id
    FOR UPDATE;

    IF v_punch IS NULL THEN
        RAISE EXCEPTION 'PUNCH_NOT_FOUND_OR_NOT_YOURS: %', p_punch_id;
    END IF;
    IF v_punch.voided_at IS NOT NULL THEN
        RAISE EXCEPTION 'ALREADY_VOIDED';
    END IF;
    IF NOW() - v_punch.created_at > v_void_window THEN
        RAISE EXCEPTION 'VOID_WINDOW_EXPIRED';
    END IF;

    UPDATE public.timecard_punches
    SET voided_at = NOW(),
        voided_by = (SELECT auth.uid()),
        updated_at = NOW()
    WHERE id = p_punch_id;

    -- Clean up derived exceptions so a new punch can correctly trigger them again.
    -- We only drop 'unjustified' exceptions; if HR already justified it, we leave it.
    IF v_punch.punch_type = 'clock_in' THEN
        DELETE FROM public.attendance_exceptions
        WHERE shift_schedule_id = v_punch.shift_schedule_id
          AND type = 'late_arrival'
          AND status = 'unjustified';
    ELSIF v_punch.punch_type = 'clock_out' THEN
        DELETE FROM public.attendance_exceptions
        WHERE shift_schedule_id = v_punch.shift_schedule_id
          AND type = 'early_departure'
          AND status = 'unjustified';
    END IF;
END;
$$;


REVOKE EXECUTE ON FUNCTION public.rpc_void_own_punch(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_void_own_punch(UUID) TO authenticated;

COMMENT ON FUNCTION public.rpc_void_own_punch(UUID) IS
    'Staff self-service punch undo within a 1-hour grace window. '
    'SECURITY DEFINER; own-row enforcement + is_claims_fresh() guard. '
    'HR/Admin voids via direct UPDATE on timecard_punches (existing RLS).';
