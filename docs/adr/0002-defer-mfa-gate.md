# 0001 — Defer Middleware Gate 6 (MFA)

**Status:** Accepted — 2026-04-19
**Decision owner:** Phase 3 implementer

## Context

`frontend_spec.md` §7 defines six middleware gates; Gate 6 requires a
`mfa_verified` timestamp claim on the JWT `app_metadata` payload and,
for `access_level = 'admin'` users, redirects to `/auth/mfa-challenge`
when the claim is absent or older than 24 hours.

The JWT emitter is
`public.handle_profile_role_change` (init_schema.sql:458-515). The
trigger writes these keys only: `staff_role`, `access_level`,
`org_unit_path`, `domains`, `last_permission_update`. `mfa_verified`
appears nowhere in `supabase/migrations/*.sql`.

If Gate 6 is enforced now, every admin is redirected to a route that
does not exist, locking the portal.

## Decision

1. Route manifest (`src/lib/rbac/route-manifest.ts`) does not carry a
   `requiresMfa` flag in Phase 3.
2. `middleware.ts` does not read `app_metadata.mfa_verified` and does
   not redirect to `/auth/mfa-challenge`.
3. `/auth/mfa-challenge` is not scaffolded in Phase 3.

## Consequences

- Phase 3 ships with Gates 1-5 enforced; Gate 6 stubbed with an
  inline comment pointing to this ADR.
- Admin MFA is still a product requirement (CLAUDE.md §11). Re-enabling
  requires:
  1. A migration that extends `handle_profile_role_change` (or a new
     auth hook) to stamp `mfa_verified` when the user completes
     TOTP/WebAuthn.
  2. Scaffolding `/auth/mfa-challenge` using Phase 2B primitives.
  3. Re-introducing the `requiresMfa` field on `RouteRequirement` and
     the Gate 6 branch in `middleware.ts`.
- Until 1-3 land, admin routes are protected by Gates 1-5 only:
  session → `password_set` → `employment_status` → portal/access_level
  alignment → domain presence. Every admin session still runs through
  Supabase Auth with password hashing + refresh rotation.

## Follow-ups

- Track the Gate 6 re-enable ticket alongside Phase 10 security
  hardening tasks.
- Document the TOTP / WebAuthn enrollment UX as part of the future
  `/auth/mfa-challenge` scope.
