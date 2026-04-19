# AgarthaOS — Session Openers

> **Companion file to `prompt.md`.** Paste one block per session into a fresh chat with the AI builder. Each block is self-contained; the agent does not need any external context beyond what's in the block plus `prompt.md` at the project root.

## How to use

1. For each session, locate the corresponding block below.
2. Copy everything between the two code-fence lines (from the opening triple backticks to the closing triple backticks).
3. Paste as the first message in a new chat session with your AI builder.
4. Follow the agent's STOP gates — reply `proceed` when you've reviewed the verification-gate evidence.

## Session plan overview

| #   | Phase(s)                               | Notes                                                      |
| --- | -------------------------------------- | ---------------------------------------------------------- |
| 1   | Phase 0 + Phase 1                      | Orientation + DB readiness                                 |
| 2   | Phase 2A                               | Tokens + shadcn — design-review gate #1                    |
| 3   | Phase 2B                               | Custom primitives + motion + print — design-review gate #2 |
| 4   | Phase 3                                | Infra + auth + middleware + portal shells                  |
| 5   | Phase 4                                | Vertical slice `/crew/attendance` — design-review gate #3  |
| 6   | Phase 5                                | 6 shared components (6 STOP gates)                         |
| 7   | Phase 6                                | 16 admin routes (16 STOP gates; long session)              |
| 8   | Phase 7 — HR                           | Management domain #1                                       |
| 9   | Phase 7 — POS                          | Management domain #2                                       |
| 10  | Phase 7 — Procurement                  | Management domain #3                                       |
| 11  | Phase 7 — Inventory                    | Management domain #4                                       |
| 12  | Phase 7 — Operations                   | Management domain #5                                       |
| 13  | Phase 7 — Marketing                    | Management domain #6                                       |
| 14  | Phase 7 — Maintenance                  | Management domain #7                                       |
| 15  | Phase 7 — Shared wrappers verification | Short session                                              |
| 16  | Phase 8                                | 13 crew routes + offline queue hardening                   |
| 17  | Phase 9a                               | Guest routes (8 routes)                                    |
| 18  | Phase 9b                               | Edge Functions (7 functions)                               |
| 19  | Phase 10 + Phase 11                    | Release gate + deployment wiring                           |

---

## Session 1 — Phase 0 + Phase 1 (Orientation + DB Readiness)

### Copy this block

```
Read prompt.md in full — all 25 absolute rules, mandatory patterns,
library contract, responsive strategy, and appendices.
Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK (this session executes TWO phases sequentially):
  1. Execute PHASE 0 top-to-bottom. Present the four manifest tables
     (RPC, Table, View, Edge Function) and a GO/NO-GO verdict.
  2. STOP. Wait for my "proceed" reply.
  3. Execute PHASE 1 top-to-bottom. Present the verification-gate
     checklist with [PASS]/[FAIL] per item and shell output evidence.
  4. STOP.

NOTES:
  - If Phase 0 returns any [MISSING] objects or stale types.ts, NO-GO.
    Do NOT proceed to Phase 1 until I remediate.
  - Phase 1 does NOT run `supabase db reset` — this is Supabase Cloud.
    Use `supabase migration list --linked` instead.
  - Phase 1 uses `supabase gen types typescript --linked`, never --local.

BEHAVIOR CONTRACT:
  0. Run `git status` first; if uncommitted changes unrelated to this
     session exist, STOP and ask me to clean up.
  1. Before writing code, paste spec citations + manifest evidence.
  2. After each phase, paste the full gate checklist with evidence.
  3. Ask "Phase N complete — proceed?" and WAIT for "proceed".
  4. If repo state differs from prerequisites, STOP.
  5. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 2 — Phase 2A (Tokens + shadcn — design gate #1)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 2A only. This is design-review gate #1.
  End with the full verification-gate evidence and STOP — wait for my
  approval of the kitchen sink before Phase 2B (that's a separate session).

NOTES:
  - Kitchen sink lives at src/app/(dev)/kitchen-sink/page.tsx
    (OUTSIDE the [locale] segment — no i18n middleware exists yet).
  - Zero raw hex in any component; everything is a token in globals.css.
  - Paste contrast ratios for every body-text and UI-component token
    pair, light + dark.

BEHAVIOR CONTRACT:
  0. Run `git status` first; if uncommitted changes unrelated to this
     session exist, STOP and ask me to clean up.
  1. Before writing code, paste spec citations.
  2. After the phase, paste the full gate checklist with evidence.
  3. Ask "Phase 2A complete — proceed?" and WAIT for "proceed".
  4. If repo state differs from prerequisites, STOP.
  5. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 3 — Phase 2B (Custom primitives + motion + print — design gate #2)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 2B only. This is design-review gate #2.
  End with the full verification-gate evidence and STOP.

NOTES:
  - Build all 13 custom CVA primitives listed in §D, plus motion
    helpers (§E), print stylesheet (§F), and the remaining kitchen-sink
    sections (§G).
  - The full kitchen sink must render all 17 sections in both themes
    at all 5 canonical viewports (375, 768, 1024, 1280, 1920).
  - Record bundle baseline — Phase 10 compares against it.

BEHAVIOR CONTRACT:
  0. Run `git status` first; if uncommitted changes unrelated to this
     session exist, STOP and ask me to clean up.
  1. Before writing code, paste spec citations.
  2. After the phase, paste the full gate checklist with evidence.
  3. Ask "Phase 2B complete — proceed?" and WAIT for "proceed".
  4. If repo state differs from prerequisites, STOP.
  5. If a primitive I ask for isn't in the §D list, STOP and request
     a scope extension — do NOT add primitives unilaterally.
  6. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 4 — Phase 3 (Infra + auth + middleware + shells)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 3 only. End with the full verification-gate evidence
  and STOP.

NOTES:
  - No feature pages in this phase — just layout, middleware, auth
    routes, empty portal shells, observability boot, security headers.
  - middleware.ts must return 404 for /kitchen-sink when
    NODE_ENV === 'production'.
  - EVERY test() in tests/e2e/smoke-auth.spec.ts MUST have "@smoke" in
    its title (e.g., `test('login as it_admin @smoke', ...)`) — Phase 11
    greps for this tag.
  - Admin + Management shells use <Sidebar> on lg+, drawer on <lg.
    Crew shell uses <BottomTabBar> on <md, top bar on ≥md.

BEHAVIOR CONTRACT:
  0. Run `git status` first; if uncommitted changes unrelated to this
     session exist, STOP and ask me to clean up.
  1. Before writing code, paste spec citations.
  2. After the phase, paste the full gate checklist with evidence.
  3. Ask "Phase 3 complete — proceed?" and WAIT for "proceed".
  4. If repo state differs from prerequisites, STOP.
  5. If a UI primitive is needed that Phase 2A/2B did not produce,
     STOP and request a Phase 2A/2B extension.
  6. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 5 — Phase 4 (Vertical slice — design gate #3)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 4 only. This is design-review gate #3.
  Build /crew/attendance end-to-end. If any gate is [FAIL], iterate
  this phase — do NOT move on.

NOTES:
  - Extend playwright.config.ts with 5 projects matching canonical
    viewports (375, 768, 1024, 1280, 1920). Do this before writing
    the visual regression specs.
  - Build src/lib/offline-queue.ts here (first consumer).
  - loading.tsx composes Phase 2B <TableSkeleton> + <StatsSkeleton>.
    Zero bespoke skeletons.
  - Paste screenshots at all 5 viewports, light + dark, for my review.

BEHAVIOR CONTRACT:
  0. Run `git status` first; if uncommitted changes unrelated to this
     session exist, STOP and ask me to clean up.
  1. Before writing code, paste spec citations (frontend_spec.md §6
     AttendancePage block + operational_workflows.md WF-5).
  2. After the phase, paste the full gate checklist with evidence.
  3. Ask "Phase 4 complete — proceed?" and WAIT for "proceed".
  4. If repo state differs from prerequisites, STOP.
  5. If a UI primitive is needed that Phase 2A/2B did not produce,
     STOP and request a Phase 2A/2B extension.
  6. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 6 — Phase 5 (6 shared components)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 5 only. Build the 6 cross-portal shared components in
  this exact order:
    1. SettingsPage (Pattern A)
    2. AnnouncementsPage (Pattern B)
    3. IncidentLogPage (Pattern B)
    4. DomainReportsPage (Pattern C)
    5. DomainAuditTable (Pattern C)
    6. TodaysCrewGrid (consumed via /management/staffing)
  STOP after EACH component and wait for "proceed" before the next.

NOTES:
  - Each component is consumed via thin route wrappers under
    /admin/..., /management/..., /crew/... per spec. Create those
    wrappers as part of each component's deliverable.
  - Phase 2A/2B primitives only — zero bespoke UI.
  - 6 STOP gates in this session. Plan for back-and-forth.

BEHAVIOR CONTRACT:
  0. Run `git status` first.
  1. Before writing each component, paste its frontend_spec.md §6 block.
  2. After each component, paste gate checklist with evidence.
  3. Ask "Component X complete — proceed?" and WAIT per component.
  4. If repo state differs from prerequisites, STOP.
  5. If a UI primitive is needed that Phase 2A/2B did not produce,
     STOP and request a Phase 2A/2B extension.
  6. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 7 — Phase 6 (16 admin routes)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 6 only. Build all 16 admin routes in the EXACT order
  listed in prompt.md (starting with /admin/it, ending with
  /admin/workforce). STOP after EACH route and wait for "proceed".

NOTES:
  - LONG SESSION — 16 routes, 16 STOP gates.
  - If you notice context pressure (responses shortening, spec re-reads
    intensifying, pattern drift in new code), PAUSE and tell me. We
    can continue in a fresh session using the failsafe prompt in
    prompt.md Scope Discipline — git history is the pattern memory.
  - Every route: RSC + Client leaf split, <DataTable> with
    mobileFieldPriority, canonical loading.tsx skeletons, error.tsx
    calling captureException, generateMetadata exported, route-segment
    config (dynamic/revalidate) declared.
  - Screenshots at 375 + 1440 (light + dark) per route.

BEHAVIOR CONTRACT:
  0. Run `git status` first.
  1. Before each route, paste its frontend_spec.md block.
  2. After each route, paste gate checklist with evidence + screenshots.
  3. Ask "Route X complete — proceed?" and WAIT per route.
  4. If repo state differs from prerequisites, STOP.
  5. If a UI primitive is needed that Phase 2A/2B did not produce,
     STOP and request a Phase 2A/2B extension.
  6. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 8 — Phase 7 (HR domain only)

> **Before starting this session:** check Phase 0's manifest output for the HR route count. Budget ~30-60 min per route. If HR has >10 routes, expect to use the context failsafe to split across multiple sessions.

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 7 — HR domain ONLY. Build every /management/hr/*
  route in the order listed by frontend_spec.md. STOP after each
  route. Do NOT touch other management domains in this session.

NOTES:
  - Shared feature module for HR lives at src/features/hr/. All HR
    routes reuse its queries/schemas/actions.
  - Same per-route rigor as Phase 6: RSC+Client split, <DataTable>
    with mobileFieldPriority, canonical loading/error/not-found,
    generateMetadata, route-segment config, screenshots 375 + 1440.
  - Management bundle budget: 350KB gzipped per route.

BEHAVIOR CONTRACT:
  0. Run `git status` first.
  1. Before each route, paste its frontend_spec.md block.
  2. After each route, paste gate checklist with evidence + screenshots.
  3. Ask "HR route X complete — proceed?" and WAIT per route.
  4. After the LAST HR route, paste a cross-domain check: no revalidatePath
     hits, no duplicate RPC wrappers, all loading.tsx compose Phase 2B
     skeletons, UI-audit greps all clean on src/features/hr/.
  5. If repo state differs from prerequisites, STOP.
  6. If a UI primitive is needed that Phase 2A/2B did not produce,
     STOP and request a Phase 2A/2B extension.
  7. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Sessions 9-14 — Phase 7 (POS / Procurement / Inventory / Operations / Marketing / Maintenance)

For each of Sessions 9-14, **copy the Session 8 block above** and replace every instance of `HR` with the correct domain name. Also replace the feature-module path `src/features/hr/` with the correct path.

| Session | Replace `HR` with | Replace `src/features/hr/` with |
| ------- | ----------------- | ------------------------------- |
| 9       | `POS`             | `src/features/pos/`             |
| 10      | `Procurement`     | `src/features/procurement/`     |
| 11      | `Inventory`       | `src/features/inventory/`       |
| 12      | `Operations`      | `src/features/operations/`      |
| 13      | `Marketing`       | `src/features/marketing/`       |
| 14      | `Maintenance`     | `src/features/maintenance/`     |

> **Before starting each of these sessions:** check Phase 0's manifest output for the domain's route count. Budget ~30-60 min per route. If the domain has >10 routes, expect to use the context failsafe to split across multiple sessions.

---

## Session 15 — Phase 7 (Shared management wrappers verification)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 7 — Shared management wrappers verification ONLY.
  Confirm these routes render correctly under the management shell:
    /management/reports
    /management/audit
    /management/announcements
    /management/attendance
    /management/staffing
    /management/settings
  Each is a thin wrapper around a Phase 5 shared component with
  management-scoped filters. STOP after each wrapper verification.

NOTES:
  - This is verification + gap-fill, not new domain work. Each wrapper
    already exists from Phase 5's per-portal wrapper creation.
  - If any wrapper is missing, create it using the Phase 5 shared
    component + management-appropriate allowed list / filter.
  - If any wrapper is broken (wrong allowedReportTypes,
    wrong allowedEntityTypes, wrong mode, wrong filter), fix it.
  - Short session relative to Sessions 8-14.

BEHAVIOR CONTRACT:
  0. Run `git status` first.
  1. For each wrapper, paste its frontend_spec.md block and verify
     the wrapper matches.
  2. After each wrapper, paste gate checklist.
  3. Ask "Wrapper X verified — proceed?" and WAIT per wrapper.
  4. If repo state differs from prerequisites, STOP.
  5. If a UI primitive is needed that Phase 2A/2B did not produce,
     STOP and request a Phase 2A/2B extension.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 16 — Phase 8 (13 crew routes + offline queue hardening)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 8 only. Build all 13 crew routes in the EXACT order
  listed in prompt.md (starting with /crew/pos, ending with
  /crew/feedback). STOP after EACH route. Also extend the offline
  queue (from Phase 4) to cover: submit_pos_order, crew_zones INSERT,
  write_offs INSERT. Playwright offline-queue.spec.ts verifies all 5
  mutations round-trip cleanly.

NOTES:
  - LONG SESSION — 13 routes + offline queue hardening. Use the
    failsafe clause if context pressure appears.
  - Crew-mobile bundle budget: 200KB gzipped per route.
  - Touch targets ≥ 44×44 verified via Playwright bounding boxes.
  - Primary CTA in bottom 100px band on 375x667 viewport.
  - Camera/QR widgets loaded via next/dynamic.
  - Screenshots at 375 + 768 per route (crew is mobile-first).

BEHAVIOR CONTRACT:
  0. Run `git status` first.
  1. Before each route, paste its frontend_spec.md block.
  2. After each route, paste gate checklist with evidence + screenshots.
  3. Ask "Route X complete — proceed?" and WAIT per route.
  4. After all 13 routes, run offline-queue.spec.ts and paste results.
  5. If repo state differs from prerequisites, STOP.
  6. If a UI primitive is needed that Phase 2A/2B did not produce,
     STOP and request a Phase 2A/2B extension.
  7. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 17 — Phase 9a (Guest routes only)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 9 — Guest routes ONLY (items 1-8 of the build order):
    1. /book          (multi-step wizard)
    2. /book/payment
    3. /my-booking
    4. /my-booking/verify
    5. /my-booking/manage
    6. /my-booking/manage/biometrics
    7. /my-booking/manage/memories
    8. /survey
  STOP after EACH route. Do NOT touch Edge Functions this session —
  those are Session 18.

NOTES:
  - /book wizard state MUST be in nuqs URL params
    (?step=date|tier|attendees|review&...), NOT a client reducer.
    This supersedes frontend_spec.md per prompt.md Phase 9.
  - CSRF double-submit: guest_csrf httpOnly cookie + x-guest-csrf
    header, rotated on OTP verification and each mutation.
  - Print stylesheets mandatory for /my-booking/confirmation and
    /my-booking/manage receipts (A4 + Letter tested).
  - Guest bundle budget: 150KB gzipped per route.
  - Mobile-first — screenshots at all 5 canonical viewports
    (375, 768, 1024, 1280, 1920), light + dark, per Master Preamble.

BEHAVIOR CONTRACT:
  0. Run `git status` first.
  1. Before each route, paste its frontend_spec.md block.
  2. After each route, paste gate checklist + screenshots.
  3. Ask "Route X complete — proceed?" and WAIT per route.
  4. If repo state differs from prerequisites, STOP.
  5. If a UI primitive is needed that Phase 2A/2B did not produce,
     STOP and request a Phase 2A/2B extension.
  6. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 18 — Phase 9b (Edge Functions only)

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK:
  Execute PHASE 9 — Edge Functions ONLY (items 1-7 of the Edge
  Functions list):
    1. confirm-booking-payment
    2. reconcile-payments
    3. send-email
    4. enroll-biometric
    5. cron-employment-sync
    6. cron-image-pipeline
    7. generate-report
  STOP after EACH function. Do NOT touch guest routes — those landed
  in Session 17.

NOTES:
  - Edge Functions run in Deno, NOT Node. Use URL imports
    (https://deno.land/std/..., npm:<pkg>). The tsconfig at repo root
    excludes supabase/functions/ from Next.js typecheck.
  - HMAC verification for webhooks uses
    src/lib/payments/verify-webhook.ts — reuse it via Deno-compatible
    import or re-implement the same signature algorithm.
  - Idempotency via payment_webhook_events table (event_id unique).
  - Every function has abuse-path E2E tests: expired OTP, missing
    CSRF, rate-limit, wrong HMAC.
  - Service-role key in functions only; never leaks to client bundles.

BEHAVIOR CONTRACT:
  0. Run `git status` first.
  1. Before each function, paste its spec citation.
  2. After each function, paste gate checklist + test results.
  3. Ask "Function X complete — proceed?" and WAIT per function.
  4. If repo state differs from prerequisites, STOP.
  5. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```

---

## Session 19 — Phase 10 + Phase 11 (Release gate + deployment wiring)

> **Before starting this session, confirm your Supabase project tier:**
>
> - **Paid (Pro+):** branching is available; Phase 11 §C.4 runs as written.
> - **Free:** branching unavailable; the agent will fall back to the single-staging-project pattern per Phase 11 §C.4 — this is expected behavior and is documented.
>
> Also verify the pre-provisioned external accounts listed in the NOTES section below. If any secret or account is missing, Phase 11 halts at its dependent step.

### Copy this block

```
Read prompt.md in full. Path: c:/Users/jouda/Desktop/agartha-world-os/prompt.md

PROJECT ROOT: c:/Users/jouda/Desktop/agartha-world-os

TASK (two phases sequentially):
  1. Execute PHASE 10 top-to-bottom. Present the Release-Gate
     checklist (13 items) with evidence for every item.
  2. STOP. Wait for my "proceed" reply.
  3. Execute PHASE 11 top-to-bottom: GitHub hardening, Vercel setup,
     Supabase CI/CD workflows, Sentry release automation, rollback
     drills (both app and migration), DORA baseline.
  4. STOP. Paste end-state summary.

PRE-PROVISIONED EXTERNAL ACCOUNTS REQUIRED (I provisioned these
before opening this session):
  - Sentry account + project + SENTRY_AUTH_TOKEN
  - Vercel account + Vercel GitHub App installed on
    esamjouda26/agartha-world-os
  - GitHub secrets set via `gh secret set`:
      SUPABASE_ACCESS_TOKEN
      SUPABASE_PROJECT_REF
      SUPABASE_DB_PASSWORD
      SENTRY_AUTH_TOKEN
      SENTRY_ORG
      SENTRY_PROJECT
  If ANY of these are missing when Phase 11 reaches a dependent
  step, STOP and tell me — I will provision before continuing.

NOTES:
  - Phase 10 includes removing /kitchen-sink, scripts/smoke-login.ts,
    and excluding supabase/seed.sql from the production deploy.
  - Phase 11 rollback drill has TWO components: Vercel app rollback
    AND Supabase migration rollback (expand/contract pattern).
  - Production smoke test runs `playwright test --grep @smoke`
    against the Vercel production URL — requires the @smoke tag to
    have been applied in Phase 3.
  - If Supabase project is on free tier, branching (Phase 11 §C.4)
    falls back to the single-staging-project pattern. Agent follows
    the documented fallback automatically.

BEHAVIOR CONTRACT:
  0. Run `git status` first.
  1. Before writing, paste spec citations.
  2. After each phase, paste the full gate checklist with evidence.
  3. Ask "Phase N complete — proceed?" and WAIT for "proceed".
  4. If repo state or pre-provisioned accounts differ from
     prerequisites, STOP.
  5. If context pressure appears, pause and tell me.

PRECEDENCE: migrations > operational_workflows > frontend_spec > prompt.md > CLAUDE.md > AGENTS.md
NEVER run `supabase db reset` or destructive pushes against cloud.
```
