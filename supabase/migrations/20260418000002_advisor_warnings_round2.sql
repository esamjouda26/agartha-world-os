-- =============================================================================
-- Security Advisor Warnings — Round 2
-- =============================================================================
-- Addresses the remaining warnings surfaced by Supabase Security Advisor after
-- the v_stock_on_hand hardening shipped in 20260418000001.
--
-- Scope (warnings):
--   1. Function Search Path Mutable (3 functions) — lock search_path to ''.
--   2. Extension in Public (btree_gist) — relocate to `extensions` schema.
--   3. RLS Policy Always True (survey_responses_insert_anon) — tighten
--      WITH CHECK so anon submissions cannot spoof staff_submitted / submitted_by.
--
-- Out of scope (intentional by architecture, documented in init_schema.sql):
--   - Public Bucket Allows Listing (storage.avatars, storage.catalog):
--     buckets declared public=TRUE by design — avatars and POS catalog images
--     are meant to be globally readable. See init_schema.sql:7025,7027.
--   - RLS Enabled No Policy (otp_challenges, biometric_vectors,
--     captured_photos, consent_records, idempotency_keys,
--     payment_webhook_events): Tier 6 default-deny, service-role only.
--     See init_schema.sql:3472-3478 and phase2 migration comments.
-- =============================================================================

SET search_path = public, extensions;

-- ── 1. Lock function search_path ───────────────────────────────────────────
-- Supabase linter: "Function Search Path Mutable". ALTER FUNCTION ... SET
-- search_path pins the session search_path on invocation without rewriting
-- the function body. Bodies of these three functions reference only
-- pg_catalog builtins (RAISE, current_setting, TG_TABLE_NAME) which resolve
-- regardless of search_path.

ALTER FUNCTION public.trg_ledger_immutable()            SET search_path = '';
ALTER FUNCTION public.trg_leave_ledger_immutable()      SET search_path = '';
ALTER FUNCTION public.trg_shift_schedule_mark_override() SET search_path = '';


-- ── 2. Relocate btree_gist out of public schema ────────────────────────────
-- Supabase linter: "Extension in Public". btree_gist backs the EXCLUDE
-- constraints at init_schema.sql:1515 and 1569 (staff_roster_assignments,
-- shift_schedules overlap prevention). Moving it to `extensions` does NOT
-- invalidate existing indexes — Postgres tracks operator classes by OID,
-- not by schema-qualified name. `extensions` is already on the database
-- search_path in Supabase projects.

ALTER EXTENSION btree_gist SET SCHEMA extensions;


-- ── 3. Tighten survey_responses anon INSERT policy ─────────────────────────
-- Supabase linter: "RLS Policy Always True". The original WITH CHECK (true)
-- at init_schema.sql:3962-3963 let any anon caller set staff_submitted=TRUE
-- and/or submitted_by=<any uuid>, spoofing the staff-captured path. Guest
-- survey submissions by definition have no auth.uid() and no staff context,
-- so we constrain anon writes to the guest shape.

DROP POLICY IF EXISTS "survey_responses_insert_anon" ON public.survey_responses;

CREATE POLICY "survey_responses_insert_anon"
    ON public.survey_responses
    FOR INSERT
    TO anon
    WITH CHECK (
        staff_submitted = FALSE
        AND submitted_by IS NULL
    );

COMMENT ON POLICY "survey_responses_insert_anon" ON public.survey_responses IS
    'Guest /survey submissions. Anon callers cannot set staff_submitted or submitted_by — those fields are reserved for the authenticated survey_responses_insert_staff path.';
