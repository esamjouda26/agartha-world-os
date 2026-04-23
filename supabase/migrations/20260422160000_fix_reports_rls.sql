-- Expand reports table RLS

DROP POLICY IF EXISTS "reports_insert" ON reports;
DROP POLICY IF EXISTS "reports_update" ON reports;
DROP POLICY IF EXISTS "reports_delete" ON reports;

-- INSERT: reports:c OR (reports:r AND owner)
CREATE POLICY "reports_insert" ON reports FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'c') OR
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r' AND created_by = (SELECT auth.uid()))
    ));

-- UPDATE: reports:u OR (reports:r AND owner)
CREATE POLICY "reports_update" ON reports FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u') OR 
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r' AND created_by = (SELECT auth.uid()))
    ))
    WITH CHECK (public.is_claims_fresh() AND (
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u') OR 
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r' AND created_by = (SELECT auth.uid()))
    ));

-- DELETE: reports:d OR (reports:r AND owner)
CREATE POLICY "reports_delete" ON reports FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'd') OR 
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r' AND created_by = (SELECT auth.uid()))
    ));


-- Expand report_executions table RLS

DROP POLICY IF EXISTS "report_executions_insert" ON report_executions;
DROP POLICY IF EXISTS "report_executions_update" ON report_executions;
DROP POLICY IF EXISTS "report_executions_delete" ON report_executions;

-- INSERT: reports:c OR (reports:r AND owner)
CREATE POLICY "report_executions_insert" ON report_executions FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'c') OR
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r' AND created_by = (SELECT auth.uid()))
    ));

-- UPDATE: reports:u OR (reports:r AND owner)
CREATE POLICY "report_executions_update" ON report_executions FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u') OR 
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r' AND created_by = (SELECT auth.uid()))
    ))
    WITH CHECK (public.is_claims_fresh() AND (
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u') OR 
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r' AND created_by = (SELECT auth.uid()))
    ));

-- DELETE: reports:d OR (reports:r AND owner)
CREATE POLICY "report_executions_delete" ON report_executions FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'd') OR 
        ((auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r' AND created_by = (SELECT auth.uid()))
    ));

COMMENT ON POLICY "reports_update" ON "public"."reports" IS 'Admins with reports:u can manage any row; managers with reports:r can manage their own rows.';
COMMENT ON POLICY "report_executions_update" ON "public"."report_executions" IS 'Admins with reports:u can manage any row; managers with reports:r can manage their own rows.';
