# Runbook — Gate 5 denial-rate spike

**Severity:** SEV-2 (degraded staff access) escalating to SEV-1 if 10%+ of staff are locked out.

## Symptoms

- Sentry breadcrumb/message `rbac.gate5.*` count (when the follow-up audit-logging layer ships) or Vercel log drain shows a burst of 307 redirects from staff portal URLs back to `/{locale}/{portal-root}?denied=...`.
- Support tickets like "I can't see the sidebar item I had yesterday."
- A/B: both `fnb_crew` and `it_admin` accounts report denied routes that previously worked.

## Diagnose

1. **Confirm the traffic pattern.** Vercel Analytics → Functions → `middleware`. Denial bursts show as correlated spikes in 307 redirects for `/admin/*`, `/management/*`, `/crew/*`.
2. **Identify the scope.** Does the spike hit:
   - One route? → likely a migration flipped an RLS domain without updating `rbac.ts` (or vice-versa).
   - One portal? → portal-wide persona check regression. Check the recent commits to `src/lib/nav/filter.ts` for changes to `excludeWhenHoldsAnyDomain` or the persona exclusion lists.
   - All portals? → JWT `domains` claim generation broke. Check `handle_profile_role_change` trigger (`init_schema.sql:458-515`) or the most recent migration that touched `role_domain_permissions`.
3. **Run the parity gate locally against prod migrations:**
   ```
   pnpm rbac:rls-parity
   pnpm rbac:pattern-uniqueness
   pnpm rbac:orphan-routes
   ```
   Any failure pinpoints the drift.
4. **Spot-check a denied user.** In Supabase SQL Editor:
   ```sql
   SELECT raw_app_meta_data -> 'domains'
   FROM auth.users WHERE email = 'affected.user@example.com';
   ```
   Compare against `rbac.ts` requirements for the path they hit.

## Mitigate

- **Fast fix (code-side drift):** revert the most recent `rbac.ts` or `nav.ts` change via `git revert`; redeploy.
- **Fast fix (schema-side drift):** the offending RLS policy was relaxed; restore via forward migration.
- **Blast-radius-wide:** roll back the last Vercel deploy via UI "instant rollback" or `vercel rollback <deployment>`.

## Recover

- After mitigation, invalidate any cached sidebar decisions: nav is RSC-rendered per request, no cache to bust.
- Confirm via a known affected account. Check Sentry/Vercel logs for the denial rate returning to baseline.

## Escalate

- SEV-1 if > 10% of staff or any admin account is locked out of their portal root; page the on-call + notify engineering lead.
- Open a postmortem within 5 business days per CLAUDE.md §12.

## Post-incident

- Add a Playwright E2E test covering the specific route+persona combo that drifted, parameterized in `tests/fixtures/rbac-paths.json` so future regressions surface pre-merge.
- If the cause was a missing CI gate, file an ADR-0004 amendment and add the gate.
