-- Fix: `get_visible_announcements` fails at runtime with Postgres
-- `42883` (undefined_function) on the `<@` ltree descendant operator.
--
-- Root cause: the function sets `search_path = ''` (security hardening
-- per CLAUDE.md §2) but the ltree operators live in `extensions` schema.
-- When `search_path` is empty, PG can't resolve `v_org_unit_path <@
-- ou.path` — the operator lookup fails before the query even executes.
-- The bug is latent: it only triggers when the planner evaluates that
-- branch, which happens for any caller (empty result sets still plan).
--
-- Pattern-match fix: replace the bare `<@` with the fully-qualified
-- `OPERATOR(extensions.<@)` form. Keeps `search_path = ''` intact (so
-- the existing security posture is unchanged) and schema-qualifies the
-- single offending identifier.
--
-- This is a forward-only definition replacement of one function. The
-- body is otherwise byte-identical to init_schema.sql:4958-5001.
-- Reversibility: re-apply the init-schema version to roll back.
CREATE OR REPLACE FUNCTION public.get_visible_announcements(p_unread_only BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    id UUID, title TEXT, content TEXT, created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, created_by_name TEXT, is_read BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role_id UUID;
    v_org_unit_path extensions.ltree;
BEGIN
    SELECT p.role_id INTO v_role_id FROM public.profiles p WHERE p.id = v_user_id;
    SELECT sr.org_unit_path INTO v_org_unit_path
    FROM public.profiles p JOIN public.staff_records sr ON sr.id = p.staff_record_id
    WHERE p.id = v_user_id;

    RETURN QUERY
    SELECT a.id, a.title, a.content, a.created_at, a.expires_at,
           creator.display_name AS created_by_name,
           CASE WHEN ar.read_at IS NOT NULL THEN TRUE ELSE FALSE END AS is_read
    FROM public.announcements a
    LEFT JOIN public.profiles creator ON creator.id = a.created_by
    LEFT JOIN public.announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = v_user_id
    WHERE a.is_published = TRUE
      AND (a.expires_at IS NULL OR a.expires_at > NOW())
      AND EXISTS (
          SELECT 1 FROM public.announcement_targets t
          WHERE t.announcement_id = a.id
            AND (
                t.target_type = 'global'
                OR (t.target_type = 'user' AND t.user_id = v_user_id)
                OR (t.target_type = 'role' AND t.role_id = v_role_id)
                OR (t.target_type = 'org_unit' AND t.org_unit_id IN (
                    SELECT ou.id FROM public.org_units ou
                    -- Fully-qualify the ltree operator so it resolves
                    -- under `search_path = ''`. Previously bare `<@`.
                    WHERE v_org_unit_path OPERATOR(extensions.<@) ou.path
                ))
            )
      )
      AND (p_unread_only = FALSE OR ar.read_at IS NULL)
    ORDER BY a.created_at DESC;
END;
$$;

-- Grants remain from init_schema — CREATE OR REPLACE preserves them.
