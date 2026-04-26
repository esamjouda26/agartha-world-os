-- Remove org_unit_path scoping from shift_schedules SELECT policy.
-- Any authenticated user with hr:r can now read all shift_schedules rows,
-- eliminating the NULL org_unit_path blind-spot for unassigned staff.
DROP POLICY IF EXISTS "shift_schedules_select" ON shift_schedules;

CREATE POLICY "shift_schedules_select" ON shift_schedules FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
    );
