-- =============================================================================
-- rpc_enroll_biometric — atomic vector + audit log insert (service-role only)
-- =============================================================================
-- Companion to the enroll-biometric Edge Function (Phase 9b). The Edge
-- Function decodes the uploaded image, hashes it (placeholder for production
-- face-embedding model), then calls this RPC with the vector hash. The RPC:
--   1. Validates the attendee exists.
--   2. Validates an active biometric_enrollment consent_records row exists
--      for the attendee (refusing enrolment without prior explicit consent
--      per BIPA §15 + GDPR Art. 9). The consent grant itself is the
--      responsibility of grantBiometricConsentAction (Phase 9a) — this
--      RPC only enforces that it happened.
--   3. Inserts (or updates on conflict) biometric_vectors. The
--      biometric_vectors.attendee_id UNIQUE constraint
--      (init_schema.sql:3344) enforces "one vector per attendee" —
--      re-enrolment overwrites the prior vector_hash.
--   4. Inserts a biometric_access_log row with event='enroll' (BIPA §15
--      audit-trail requirement).
--
-- All operations execute in one transaction. SECURITY DEFINER + search_path=''
-- per CLAUDE.md §2. service_role-only execution per CLAUDE.md §11
-- "Privilege Least".
--
-- Returns:
--   { success: true,  attendee_id, vector_id, reused_existing }
--   { success: false, error: 'NO_ACTIVE_CONSENT' | 'INVALID_ATTENDEE' }
-- =============================================================================

SET check_function_bodies = OFF;
SET client_min_messages = WARNING;

CREATE OR REPLACE FUNCTION public.rpc_enroll_biometric(
    p_attendee_id   UUID,
    p_vector_hash   TEXT,
    p_actor_type    TEXT  DEFAULT 'guest_self',
    p_actor_id      UUID  DEFAULT NULL,
    p_ip_address    INET  DEFAULT NULL,
    p_user_agent    TEXT  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_existing_vector_id  UUID;
    v_vector_id           UUID;
    v_reused_existing     BOOLEAN := FALSE;
    v_consent_exists      BOOLEAN;
    v_attendee_exists     BOOLEAN;
BEGIN
    IF p_actor_type NOT IN ('guest_self', 'staff', 'system') THEN
        RAISE EXCEPTION 'INVALID_ACTOR_TYPE';
    END IF;

    IF p_vector_hash IS NULL OR length(p_vector_hash) < 16 THEN
        RAISE EXCEPTION 'INVALID_VECTOR_HASH';
    END IF;

    -- 1. Attendee must exist.
    SELECT EXISTS(
        SELECT 1 FROM public.booking_attendees WHERE id = p_attendee_id
    ) INTO v_attendee_exists;
    IF NOT v_attendee_exists THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_ATTENDEE');
    END IF;

    -- 2. Active biometric_enrollment consent must exist (Phase 9a inserts it).
    SELECT EXISTS(
        SELECT 1
          FROM public.consent_records
         WHERE subject_id   = p_attendee_id
           AND subject_type = 'booking_attendee'
           AND consent_type = 'biometric_enrollment'
           AND withdrawn_at IS NULL
    ) INTO v_consent_exists;
    IF NOT v_consent_exists THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'NO_ACTIVE_CONSENT');
    END IF;

    -- 3. Upsert vector. attendee_id UNIQUE means re-enrolment updates.
    SELECT id INTO v_existing_vector_id
      FROM public.biometric_vectors
     WHERE attendee_id = p_attendee_id;

    IF v_existing_vector_id IS NOT NULL THEN
        UPDATE public.biometric_vectors
           SET vector_hash = p_vector_hash,
               updated_at  = NOW()
         WHERE id = v_existing_vector_id;
        v_vector_id := v_existing_vector_id;
        v_reused_existing := TRUE;
    ELSE
        INSERT INTO public.biometric_vectors (attendee_id, vector_hash)
        VALUES (p_attendee_id, p_vector_hash)
        RETURNING id INTO v_vector_id;
        v_reused_existing := FALSE;
    END IF;

    -- 4. Audit log — append-only per Phase 2 RLS (no UPDATE/DELETE policy).
    INSERT INTO public.biometric_access_log
        (attendee_id, event, actor_type, actor_id, ip_address, user_agent)
    VALUES
        (p_attendee_id, 'enroll', p_actor_type, p_actor_id, p_ip_address, p_user_agent);

    RETURN jsonb_build_object(
        'success',         TRUE,
        'attendee_id',     p_attendee_id,
        'vector_id',       v_vector_id,
        'reused_existing', v_reused_existing
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_enroll_biometric(UUID, TEXT, TEXT, UUID, INET, TEXT)
    FROM PUBLIC, anon, authenticated;
-- service_role only. Invoked from enroll-biometric Edge Function.

COMMENT ON FUNCTION public.rpc_enroll_biometric(UUID, TEXT, TEXT, UUID, INET, TEXT) IS
    'Atomic biometric vector + audit log insert. Validates active biometric_enrollment consent before enrolling. Service-role only.';
