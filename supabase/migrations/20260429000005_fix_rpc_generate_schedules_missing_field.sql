-- =============================================================================
-- Fix rpc_generate_schedules — SELECT missing effective_end_date column
-- =============================================================================
-- The original definition in init_schema.sql:6099-6107 selected only 5
-- fields into the v_assignment record:
--     sra.staff_record_id,
--     sra.roster_template_id,
--     sra.effective_start_date,
--     rt.cycle_length_days,
--     rt.anchor_date
--
-- but the WHILE loop body (line 6107) reads
--     v_assignment.effective_end_date
-- which was never selected. PostgreSQL raises:
--     ERROR: record "v_assignment" has no field "effective_end_date"
--
-- Result: every cron tick (`daily-schedule-generation`, 0 14 * * *) since
-- the function was deployed has failed silently — confirmed by 10
-- consecutive failures in cron.job_run_details. shift_schedules has not
-- received any auto-generated rows during that period; only the
-- demo-seeded rows from seed.sql remain, with growing date gaps.
--
-- This migration replaces the function with the correct SELECT list. No
-- behavioural change beyond the bug fix; signature, permissions, and
-- audit trigger are preserved.
--
-- Cloud impact: function body REPLACEd; existing cron schedule keeps
-- pointing at the same function name and signature, so the next 14:00
-- UTC tick will succeed and start backfilling missing shifts.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_generate_schedules(p_days_ahead INTEGER DEFAULT 14)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_start_date DATE;
    v_end_date   DATE;
    v_count      INTEGER := 0;
    v_assignment RECORD;
    v_target     DATE;
    v_day_index  INTEGER;
    v_shift      RECORD;
BEGIN
    PERFORM set_config('app.settings.template_regeneration', 'true', true);
    v_start_date := CURRENT_DATE + 1;
    v_end_date   := CURRENT_DATE + p_days_ahead;

    FOR v_assignment IN
        SELECT
            sra.staff_record_id,
            sra.roster_template_id,
            sra.effective_start_date,
            sra.effective_end_date,           -- FIX: added; was missing in init_schema.sql:6100
            rt.cycle_length_days,
            rt.anchor_date
        FROM public.staff_roster_assignments sra
        JOIN public.roster_templates rt ON rt.id = sra.roster_template_id
        JOIN public.staff_records   sr ON sr.id  = sra.staff_record_id
        JOIN public.profiles        p  ON p.staff_record_id = sr.id
        WHERE p.employment_status = 'active'
          AND rt.is_active = TRUE
          AND sra.effective_start_date <= v_end_date
          AND (sra.effective_end_date IS NULL OR sra.effective_end_date >= v_start_date)
    LOOP
        v_target := GREATEST(v_start_date, v_assignment.effective_start_date);

        WHILE v_target <= v_end_date
          AND (v_assignment.effective_end_date IS NULL
               OR v_target <= v_assignment.effective_end_date)
        LOOP
            v_day_index := (((v_target - v_assignment.anchor_date) % v_assignment.cycle_length_days)
                            + v_assignment.cycle_length_days) % v_assignment.cycle_length_days + 1;

            SELECT rts.shift_type_id, st.start_time, st.end_time
              INTO v_shift
              FROM public.roster_template_shifts rts
              JOIN public.shift_types st ON st.id = rts.shift_type_id
             WHERE rts.template_id = v_assignment.roster_template_id
               AND rts.day_index   = v_day_index;

            IF v_shift IS NOT NULL THEN
                INSERT INTO public.shift_schedules
                    (staff_record_id, shift_date, shift_type_id,
                     expected_start_time, expected_end_time, is_override)
                VALUES
                    (v_assignment.staff_record_id, v_target, v_shift.shift_type_id,
                     v_shift.start_time, v_shift.end_time, FALSE)
                ON CONFLICT (staff_record_id, shift_date) DO NOTHING;

                IF FOUND THEN
                    v_count := v_count + 1;
                END IF;
            END IF;

            v_target := v_target + 1;
        END LOOP;
    END LOOP;

    RETURN v_count;
END;
$$;

-- Permissions unchanged — service_role only, invoked from pg_cron.
REVOKE EXECUTE ON FUNCTION public.rpc_generate_schedules(INTEGER) FROM PUBLIC, anon, authenticated;
