-- Phase 5 Session 6 — Announcements CRUD RPCs
--
-- Adds the SECURITY DEFINER RPCs the Server Actions need for
-- multi-table announcement mutations. Without these, Server Actions
-- would have to run two-statement sequences (announcements + targets
-- in separate round-trips), which CLAUDE.md §4 "Transactional
-- Boundaries" forbids for related mutations.
--
-- Additions (all additive — no ALTER, no DROP):
--   1. rpc_create_announcement  — announcement + N targets in one tx
--   2. rpc_update_announcement  — update row + replace targets in one tx
--   3. rpc_get_unread_announcement_count — efficient badge count
--   4. rpc_mark_all_visible_announcements_read — bulk mark-as-read in one tx
--
-- Domain gating is enforced inside each RPC via the JWT
-- `app_metadata.domains.comms` claim:
--   - create : comms:c
--   - update : comms:u
--   - count / read : authenticated (same surface as
--                    get_visible_announcements)
--   - mark-all : authenticated (writing to own announcement_reads row)
--
-- Reversibility: every change is a CREATE OR REPLACE / new function.
-- Down-migration (if ever required): `DROP FUNCTION IF EXISTS
-- public.rpc_<name>(…)` in reverse order. No schema rows moved.

-- ─────────────────────────────────────────────────────────────────
-- 1. rpc_create_announcement
--    Creates an announcement + at least one target in a single tx.
--    `p_targets` is a JSONB array of `{target_type, role_id?,
--    org_unit_id?, user_id?}` objects matching the CHECK constraint
--    at announcement_targets.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_create_announcement(
    p_title TEXT,
    p_content TEXT,
    p_is_published BOOLEAN,
    p_expires_at TIMESTAMPTZ,
    p_targets JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_announcement_id UUID;
    v_target JSONB;
    v_target_count INT;
BEGIN
    -- AuthZ: must hold comms:c. Enforced here (not only via RLS) so the
    -- RPC can fail fast with a clear ERRCODE rather than letting INSERT
    -- fail mid-loop.
    IF NOT ((SELECT auth.jwt()) -> 'app_metadata' -> 'domains' -> 'comms' ? 'c') THEN
        RAISE EXCEPTION 'FORBIDDEN: requires comms:c'
            USING ERRCODE = '42501';
    END IF;

    -- Input validation: at least one target row — announcement_targets
    -- CHECK constraint already enforces per-row shape; we enforce
    -- cardinality here so a zero-target INSERT doesn't silently create
    -- an orphan announcement that no user would ever see.
    IF p_targets IS NULL OR jsonb_typeof(p_targets) <> 'array' THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: p_targets must be a JSON array'
            USING ERRCODE = '22023';
    END IF;
    v_target_count := jsonb_array_length(p_targets);
    IF v_target_count = 0 THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: at least one target is required'
            USING ERRCODE = '22023';
    END IF;
    IF p_title IS NULL OR length(btrim(p_title)) = 0 THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: title is required'
            USING ERRCODE = '22023';
    END IF;
    IF p_content IS NULL OR length(btrim(p_content)) = 0 THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: content is required'
            USING ERRCODE = '22023';
    END IF;

    -- Create the announcement row.
    INSERT INTO public.announcements (
        title, content, is_published, expires_at, created_by, updated_by
    ) VALUES (
        p_title,
        p_content,
        COALESCE(p_is_published, FALSE),
        p_expires_at,
        (SELECT auth.uid()),
        (SELECT auth.uid())
    )
    RETURNING id INTO v_announcement_id;

    -- Insert targets. The CHECK constraint at announcement_targets is
    -- authoritative for target_type/role_id/org_unit_id/user_id shape;
    -- Postgres will raise `check_violation` if a malformed target is
    -- passed, aborting the whole transaction.
    FOR v_target IN SELECT * FROM jsonb_array_elements(p_targets) LOOP
        INSERT INTO public.announcement_targets (
            announcement_id,
            target_type,
            role_id,
            org_unit_id,
            user_id
        ) VALUES (
            v_announcement_id,
            (v_target ->> 'target_type')::public.announcement_target_type,
            NULLIF(v_target ->> 'role_id', '')::UUID,
            NULLIF(v_target ->> 'org_unit_id', '')::UUID,
            NULLIF(v_target ->> 'user_id', '')::UUID
        );
    END LOOP;

    RETURN v_announcement_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_create_announcement(TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_announcement(TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, JSONB) TO authenticated;

COMMENT ON FUNCTION public.rpc_create_announcement(TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, JSONB) IS
'Creates an announcement + its targets in a single transaction. Requires comms:c. Targets param is a JSONB array of {target_type, role_id?, org_unit_id?, user_id?} objects. Raises 42501 on missing grant, 22023 on malformed input.';

-- ─────────────────────────────────────────────────────────────────
-- 2. rpc_update_announcement
--    Updates the row + replaces the target set in one tx.
--    Replace-all is the right semantic for this surface: the editor
--    sees the current set, edits, resubmits; merging target diffs
--    would require the UI to track server IDs for every row and
--    complicate the client for no gain.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_update_announcement(
    p_announcement_id UUID,
    p_title TEXT,
    p_content TEXT,
    p_is_published BOOLEAN,
    p_expires_at TIMESTAMPTZ,
    p_targets JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_target JSONB;
    v_row_exists BOOLEAN;
BEGIN
    -- AuthZ: comms:u for row update.
    IF NOT ((SELECT auth.jwt()) -> 'app_metadata' -> 'domains' -> 'comms' ? 'u') THEN
        RAISE EXCEPTION 'FORBIDDEN: requires comms:u'
            USING ERRCODE = '42501';
    END IF;

    IF p_targets IS NULL OR jsonb_typeof(p_targets) <> 'array'
       OR jsonb_array_length(p_targets) = 0 THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: at least one target is required'
            USING ERRCODE = '22023';
    END IF;
    IF p_title IS NULL OR length(btrim(p_title)) = 0
       OR p_content IS NULL OR length(btrim(p_content)) = 0 THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: title and content are required'
            USING ERRCODE = '22023';
    END IF;

    -- Ensure row exists before touching targets — avoids an orphaned
    -- target-replacement round if the id is stale.
    SELECT EXISTS (
        SELECT 1 FROM public.announcements WHERE id = p_announcement_id
    ) INTO v_row_exists;
    IF NOT v_row_exists THEN
        RAISE EXCEPTION 'NOT_FOUND: announcement % does not exist', p_announcement_id
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.announcements
    SET title = p_title,
        content = p_content,
        is_published = COALESCE(p_is_published, is_published),
        expires_at = p_expires_at,
        updated_by = (SELECT auth.uid()),
        updated_at = NOW()
    WHERE id = p_announcement_id;

    -- Replace the full target set. `announcement_targets.announcement_id`
    -- has ON DELETE CASCADE so deleting here leaves no dangling rows.
    DELETE FROM public.announcement_targets WHERE announcement_id = p_announcement_id;

    FOR v_target IN SELECT * FROM jsonb_array_elements(p_targets) LOOP
        INSERT INTO public.announcement_targets (
            announcement_id,
            target_type,
            role_id,
            org_unit_id,
            user_id
        ) VALUES (
            p_announcement_id,
            (v_target ->> 'target_type')::public.announcement_target_type,
            NULLIF(v_target ->> 'role_id', '')::UUID,
            NULLIF(v_target ->> 'org_unit_id', '')::UUID,
            NULLIF(v_target ->> 'user_id', '')::UUID
        );
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_update_announcement(UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_announcement(UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, JSONB) TO authenticated;

COMMENT ON FUNCTION public.rpc_update_announcement(UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, JSONB) IS
'Updates an announcement and replaces its target set atomically. Requires comms:u. Raises 42501/22023/P0002 on auth/input/missing-row errors.';

-- ─────────────────────────────────────────────────────────────────
-- 3. rpc_get_unread_announcement_count
--    Single scalar used by the topbar bell badge. Wraps
--    get_visible_announcements(TRUE) so "visibility" semantics stay
--    defined in exactly one place.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_get_unread_announcement_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.get_visible_announcements(TRUE);
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_unread_announcement_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_unread_announcement_count() TO authenticated;

COMMENT ON FUNCTION public.rpc_get_unread_announcement_count() IS
'Returns the caller''s unread announcement count. Backs the topbar bell badge. Delegates visibility to get_visible_announcements(TRUE).';

-- ─────────────────────────────────────────────────────────────────
-- 4. rpc_mark_all_visible_announcements_read
--    Batch mark-all-as-read in a single transaction. Returns the
--    number of rows newly inserted (i.e. rows that weren't already
--    read) so the UI can show "marked N as read" feedback.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_mark_all_visible_announcements_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := (SELECT auth.uid());
    v_inserted INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '28000';
    END IF;

    WITH inserted AS (
        INSERT INTO public.announcement_reads (announcement_id, user_id)
        SELECT v.id, v_user_id
        FROM public.get_visible_announcements(TRUE) v
        ON CONFLICT (announcement_id, user_id) DO NOTHING
        RETURNING announcement_id
    )
    SELECT COUNT(*)::INT INTO v_inserted FROM inserted;

    RETURN COALESCE(v_inserted, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_mark_all_visible_announcements_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_mark_all_visible_announcements_read() TO authenticated;

COMMENT ON FUNCTION public.rpc_mark_all_visible_announcements_read() IS
'Marks every currently-visible unread announcement as read for the caller. Returns the count newly inserted. Idempotent via ON CONFLICT DO NOTHING.';
