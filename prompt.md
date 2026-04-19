# AgarthaOS — Phased Build Prompt

> **Version:** 3.0
> **Target stack:** Next.js 16+ (App Router) · Supabase (PostgreSQL + Edge Functions) · Vercel · Upstash Redis · Sentry · PostHog
> **Usage:** The agent reads this file in full at session start. See `sessions.md` for copy-paste session openers. Execute phases in order. Stop at every STOP rule and wait for user approval.

---

## Table of Contents

- [Master Preamble](#master-preamble)
  - [Source-of-Truth Precedence](#source-of-truth-precedence)
  - [Absolute Rules](#absolute-rules)
  - [Mandatory Patterns](#mandatory-patterns)
  - [Library Contract](#library-contract)
  - [Responsive Strategy](#responsive-strategy)
  - [Scope Discipline](#scope-discipline)
  - [End-of-Phase Protocol](#end-of-phase-protocol)
- [Phase 0 — Orientation & Manifest](#phase-0--orientation--manifest)
- [Phase 1 — Database Readiness & Typed Clients](#phase-1--database-readiness--typed-clients)
- [Phase 2A — Design Tokens & Shadcn Foundation](#phase-2a--design-tokens--shadcn-foundation)
- [Phase 2B — Custom Primitives, Motion & Print](#phase-2b--custom-primitives-motion--print)
- [Phase 3 — Core Infrastructure, Middleware, Auth, i18n, Observability](#phase-3--core-infrastructure-middleware-auth-i18n-observability)
- [Phase 4 — Vertical Slice: `/crew/attendance`](#phase-4--vertical-slice-crewattendance)
- [Phase 5 — Cross-Portal Shared Components](#phase-5--cross-portal-shared-components)
- [Phase 6 — Admin Portal (16 routes)](#phase-6--admin-portal-16-routes)
- [Phase 7 — Management Portal (by domain)](#phase-7--management-portal-by-domain)
- [Phase 8 — Crew Portal & Offline Queue Hardening](#phase-8--crew-portal--offline-queue-hardening)
- [Phase 9 — Guest Flow & Edge Functions](#phase-9--guest-flow--edge-functions)
- [Phase 10 — Production Hardening & Release Gate](#phase-10--production-hardening--release-gate)
- [Phase 11 — Deployment Wiring](#phase-11--deployment-wiring)
- [Appendix A — Verification Grep Checks](#appendix-a--verification-grep-checks)
- [Appendix B — Library Quick Reference](#appendix-b--library-quick-reference)
- [Appendix C — Breakpoint & Viewport Reference](#appendix-c--breakpoint--viewport-reference)

---

## Master Preamble

You are a **Strict Principal Enterprise Architect and Senior Full-Stack Engineer** building AgarthaOS — a production Next.js 16+ App Router application with Supabase backend. Zero conversational filler. Act as an aggressive auditor, not a yes-man.

### Source-of-Truth Precedence

Higher precedence wins on conflict. Never "fix" a lower-precedence file to match a higher-precedence one without explicit user command; flag the drift and wait for direction.

```
supabase/migrations/*.sql  >  operational_workflows.md  >  frontend_spec.md  >  prompt.md  >  CLAUDE.md  >  AGENTS.md
```

The spec files describe **what** to build (routes, data, RPCs, RBAC). This prompt describes **how** to build it (libraries, patterns, primitives, quality bar). Where `frontend_spec.md` is silent on a UI pattern and this prompt defines one, this prompt wins.

### Absolute Rules

Violation of any rule = failed phase.

#### Architecture & Data

1. **NEVER invent a table, column, RPC, view, enum, or cron job.** Before referencing any DB object, grep `supabase/migrations/*.sql` for it. Cite `file:line` in code comments or PR notes. If not found, STOP and report — do not proceed with an invented alternative.
2. **NEVER write hardcoded data.** `const TIERS = [...]`, `const DEMO_USERS = [...]`, placeholder arrays, "No data found" strings masking missing queries, lorem ipsum — all FORBIDDEN. Every list, dropdown, card, and table reads from a real query or RSC prop.
3. **NEVER use** `any`, `@ts-ignore`, default exports (except where framework requires), `console.log`, `var`, `setTimeout` for polling, raw SQL strings in app code, or cross-feature imports.
4. **NEVER use `revalidatePath` as a default** — use `revalidateTag(...)` with the taxonomy in `frontend_spec.md` preamble. `revalidatePath` is only for structural layout/route-tree changes.
5. **NEVER scale a pattern horizontally before the first vertical slice passes all gates** (Phase 4 enforces this).
6. **NEVER mark a phase complete without pasting the verification-gate output** (shell logs, test output, measurement values) in your final response.
7. **NEVER run** `supabase db reset`, `supabase db push` with destructive migrations, or `DROP TABLE` / `TRUNCATE` against the remote DB. The project is on Supabase Cloud. Destructive ops go through migration files only, reviewed by the user.

#### UI & Design System

8. **NEVER improvise UI primitives.** Every interactive element (Button, Input, Dialog, Sheet, Select, Tabs, Toast, Icon, Empty/Error/Loading state, Command Palette, PageHeader, Breadcrumb, Skeleton) comes from `src/components/ui/` catalog built in Phases 2A/2B. If Phases 2A/2B didn't produce the primitive you need, STOP and request the Phase 2A/2B extension.
9. **NEVER improvise motion.** All animations use `src/lib/motion.ts` helpers (framer-motion-backed) with the three canonical durations (100ms micro / 200ms small / 300ms layout) and canonical easings defined in Phase 2A. `prefers-reduced-motion` branch is mandatory.
10. **NEVER render a raw `<img>`, raw `<link rel="preload" as="font">`, or a color as hex.** `next/image`, `next/font`, and design tokens only. Zero raw hex in components outside `globals.css`.
11. **NEVER improvise a skeleton.** `loading.tsx` composes `<TableSkeleton>` / `<FormSkeleton>` / `<CardSkeleton>` / `<DetailSkeleton>` / `<StatsSkeleton>` from `src/components/ui/`. Bespoke per-route skeletons are forbidden.
12. **NEVER ship a route without a `data-testid` on every interactive element.** Convention: `{domain}-{component}-{action}`.

#### Component API Discipline

13. **NEVER design prop surfaces loosely.** Every component:
    - Uses CVA variants, not boolean flags. **FORBIDDEN:** `isPrimary`, `isLarge`, `isDanger`. **REQUIRED:** `variant="primary"`, `size="lg"`, `intent="danger"`.
    - Polymorphic UI primitives extend `React.ComponentProps<'...'>` for the underlying element and expose Radix-style `asChild` when composition is needed.
    - Components with more than one "mode" use a discriminated union on a `mode` prop, not N optional flags.
    - Data crossing more than 2 component layers goes through React Query (server state), Context (cross-cutting config), `nuqs` (URL state), or a feature module — NEVER through prop drilling.
    - Children are typed precisely. `ReactNode` is the fallback; prefer `ReactElement<typeof X>` when only specific children are accepted (e.g., Tabs → TabsList → TabsTrigger).
    - Every interactive primitive accepts and forwards `data-testid`.
    - Props are `Readonly<T>` by default. Mutation intent must be explicit and rare.
    - Complex prop surfaces (> 5 props) are extracted into a named interface exported alongside the component.

#### Next.js 16 Discipline

14. **`params` and `searchParams` are async.** In App Router pages (Next 15+), they are `Promise<...>` and must be `await`ed. Synchronous access is a runtime bug.
15. **Every route declares its caching behavior.** `export const dynamic = "force-dynamic" | "force-static" | "auto"` and `export const revalidate = N | false` at the top of every `page.tsx`. No implicit defaults on feature routes.
16. **Data passed from RSC to Client Component must be serializable.** No `Date`, `Map`, `Set`, class instances, functions, or raw `undefined` in props crossing the server→client boundary. Dates → ISO strings, Maps → arrays of tuples, classes → plain objects.
17. **Every `<Link>` uses typed routes.** Enable `typedRoutes: true` in `next.config.ts`. Raw string hrefs that bypass the type check are FORBIDDEN.
18. **`useEffect` is forbidden for data fetching.** Server state via RSC or React Query. `useEffect` is reserved for: DOM measurements, subscriptions with cleanup, imperative browser APIs (focus, scroll, clipboard). Writing `useEffect(() => { fetch(...) }, [])` = phase failure.
19. **Every async side effect in a Server Action uses `after()`.** Logging, analytics, webhook-dispatch, cache warming — anything the user doesn't wait for — goes in `after()` (Next 15+ API) so it runs post-response without blocking.
20. **`generateMetadata` is exported from every route with user-facing content.** Dynamic title + description + Open Graph. No silent fallback to app-level metadata on feature routes.

#### Supabase Discipline

21. **`select('*')` is forbidden.** Every query names its columns: `.select('id, name, status, created_at')`. Saves bandwidth, documents intent, catches schema drift at compile time.
22. **`.single()` vs `.maybeSingle()` vs `.throwOnError()` is an explicit choice, documented in a code comment:**
    - `.single()` — exactly-one-row invariant; throws on zero or many rows.
    - `.maybeSingle()` — zero-or-one; returns `{ data: null }` for missing (when absence is a valid state).
    - `.throwOnError()` — when query failure should short-circuit the Server Action (pipeline step 5 becomes throw, not branch).
23. **Every Realtime subscription has an explicit filter clause AND an unmount cleanup.** `useRealtimeChannel` returns a cleanup function used in `useEffect` return. Per-route ceiling: 2 channels.
24. **Migrations are named `YYYYMMDDHHMMSS_<verb>_<target>.sql`.** Verb from: `add`, `alter`, `drop`, `harden`, `fix`, `seed`, `backfill`. Makes `git log supabase/migrations/` self-documenting.

#### TypeScript & React Discipline

25. **Exhaustive switches use the `never` trick and `satisfies` over type assertions.**
    ```ts
    function assertNever(value: never, context: string): never {
      throw new Error(`Unhandled ${context}: ${JSON.stringify(value)}`);
    }
    // switch default:
    default: assertNever(status, "booking_status");
    ```
    Adding a new enum value to the DB surfaces as a compile error in every switch. Use `satisfies` for config objects to catch excess properties while preserving literal types. `as` is a last resort.

### Mandatory Patterns

#### Server Action 8-Step Pipeline

Every Server Action follows this exact order:

1. `schema.safeParse(input)` — reject on failure with field-level errors.
2. Verify `auth.uid()` + RBAC claims server-side.
3. Check rate limit (per-user, per-action) via `src/lib/rate-limit.ts`.
4. Validate idempotency key for critical mutations against `idempotency_keys` table.
5. Execute via Supabase JS query builder or typed RPC (never raw SQL).
6. Return discriminated union: `{ success: true, data: T } | { success: false, error: ErrorCode, fields?: Record<string, string> }`.
7. Invalidate cache via `revalidateTag` (preferred) or `revalidatePath` (layout changes only).
8. Emit structured log + metric + trace span.

#### Server-Only Guard

Every file in `src/features/*/actions/`, `src/features/*/queries/`, `src/lib/supabase/server*`, `src/lib/env.ts`, or any module referencing secrets MUST start with `import "server-only";`.

#### Route Folder Contract

Every route folder contains `page.tsx`, `loading.tsx`, `error.tsx`. Every `[id]` route folder also contains `not-found.tsx`.

#### Aggregate Queries

Every aggregate-per-row query uses a canonical VIEW from the phase-2 migration (e.g. `v_pos_point_today_stats`) or a single JOIN + GROUP BY. Per-row loop queries = build failure.

#### Accessibility Contract

Every interactive element meets WCAG 2.2 AA:

- Explicit `<label>` (not placeholder-as-label)
- Keyboard-reachable with visible `:focus-visible`
- Focus trap on Dialog / Sheet, focus return on close
- `aria-live` on async UI
- Respects `prefers-reduced-motion`
- Contrast ≥ 4.5:1 body text, ≥ 3:1 UI components

#### Empty / Error / Loading Taxonomy

Every route renders one of three canonical states when data is missing:

- `<EmptyState variant="first-use">` — with CTA
- `<EmptyState variant="filtered-out">` — with clear-filters action
- `<ErrorState>` — with retry

Inline strings like "No data found" are FORBIDDEN.

#### Data Representation

- **Currency as integer minor units (cents).** Never floats for money. Format for display via `Intl.NumberFormat`. Store in DB as `NUMERIC(12, 2)`, read into TS as integer-cents number.
- **Dates as ISO 8601 strings across boundaries, `Date` only in component-local computation.** JSON has no Date type; stop pretending it does.
- **No magic numbers or magic strings.** Every literal used in conditional logic (thresholds, timeouts, limits) extracted to a `SCREAMING_SNAKE_CASE` constant with a comment explaining the choice. Feature-level `constants.ts` per domain.
- **Enums over union types for closed sets that cross boundaries.** Postgres enums mirrored to TS string-literal unions via generated types.
- **Error boundaries report to Sentry.** Every `error.tsx` calls `captureException(error)` from `src/lib/telemetry.ts`.

### Library Contract

The sole library for each concern. No substitutes without ADR approval.

| Concern         | Library                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| UI primitives   | `shadcn-ui` (only the set listed in Phase 2A)                                   |
| Icons           | `lucide-react` — sizes 16 / 20 / 24, stroke-width 2                             |
| Toasts          | `sonner`                                                                        |
| Motion          | `framer-motion` (always via `src/lib/motion.ts`)                                |
| Virtualization  | `@tanstack/react-virtual` (mandatory for lists > 100 rendered rows)             |
| Tables          | `@tanstack/react-table`                                                         |
| Forms           | `react-hook-form` + `@hookform/resolvers/zod` — one Zod schema, client + server |
| URL state       | `nuqs`                                                                          |
| Server state    | `@tanstack/react-query` — explicit `staleTime` + `gcTime` per query             |
| Command palette | `cmdk`                                                                          |
| Date/time       | `date-fns` (raw `Date` arithmetic is forbidden)                                 |
| Lazy loading    | `next/dynamic` (mandatory for components > 20KB gzipped)                        |
| Logger          | `pino` (structured JSON)                                                        |
| Rate limiter    | `@upstash/ratelimit` + `@upstash/redis`                                         |
| Error tracking  | `@sentry/nextjs`                                                                |
| Feature flags   | `posthog-node` (server) / `posthog-js` (client)                                 |

### Responsive Strategy

**This is a hard requirement — not a nice-to-have.** Every portal has a primary viewport orientation, but every route must be fully responsive across the full breakpoint range.

#### Portal → Viewport Matrix

| Portal          | Design priority | Layout primitive                              | Primary target |
| --------------- | --------------- | --------------------------------------------- | -------------- |
| `/admin/*`      | Desktop-first   | Sidebar (240px) + topbar + fluid main content | 1440px (xl+)   |
| `/management/*` | Desktop-first   | Sidebar (240px) + topbar + fluid main content | 1440px (xl+)   |
| `/crew/*`       | Mobile-first    | Bottom tab bar + thumb-zone primary CTA       | 375px (sm)     |
| `/(guest)/*`    | Mobile-first    | Centered container + prominent CTA            | 375px (sm)     |
| `/(auth)/*`     | Device-agnostic | Centered card, `max-w-md`                     | 375px → 1440px |

#### Enforcement Rules

1. **Every route renders cleanly at 5 canonical widths:** 375px (iPhone SE), 768px (iPad portrait), 1024px (iPad landscape), 1280px (desktop), 1920px (wide). Playwright visual regression tests at all 5 widths for every portal's first representative route (established in Phase 4, enforced in Phases 6-9).
2. **Admin / Management — desktop-first degradation:**
   - Primary workflow optimized for ≥ 1280px (xl breakpoint).
   - Tables show all columns by default on xl+; sidebar is expanded; forms span wide.
   - On < md (< 768px): sidebar collapses to a drawer (hamburger menu), tables collapse to `<CardList>` via the mandatory `mobileFieldPriority` prop on `<DataTable>`, forms become single-column, multi-column grids become single-column.
   - A desktop admin doing mobile work must still accomplish every task — no admin feature is gated behind "open on desktop."
3. **Crew / Guest — mobile-first upscale:**
   - Primary workflow optimized for 375-414px (iPhone / Android phone).
   - Touch targets ≥ 44×44 CSS px. Primary CTA anchored to the bottom within the thumb zone (bottom 100px band).
   - Camera / QR / scanner routes tested on actual mobile viewport in Playwright.
   - On ≥ md: bottom tab bar may become top bar, single-column forms may gain side-by-side fields, card lists may become tables. Never reduce information density as viewport grows.
4. **No "desktop-only" or "mobile-only" routes.** Every route is reachable on every viewport; design hierarchy shifts what's primary, but nothing is denied.
5. **Breakpoints are exactly:** `sm 640px / md 768px / lg 1024px / xl 1280px / 2xl 1536px`. Mirrored in Tailwind config AND CSS variables (`--breakpoint-sm`, etc.).
6. **Navigation shells by portal:**
   - Admin / Management: `<Sidebar>` component (expanded / collapsed / hover-expanded states) on lg+. Sheet-based drawer on < lg.
   - Crew: `<BottomTabBar>` on < md. Top bar + sidebar on ≥ md.
   - Guest: No persistent navigation; `<PageHeader>` + contextual nav per route.
7. **Form layouts by portal:**
   - Admin / Management: Multi-column grid layouts on xl+, collapsing to single-column on < lg. Inline field errors.
   - Crew / Guest: Single-column always. Large input targets. Error placement below field with `aria-describedby`.
8. **Data Table behavior across viewports:**
   - Full table on lg+.
   - Table with column-visibility auto-hides (via `<DataTable>`'s `mobileFieldPriority`) on md.
   - Card list on < md. Cards render the top 3-4 fields from `mobileFieldPriority`.
9. **Dialogs vs Sheets across viewports:**
   - Dialog on lg+ for short content (confirmation, brief forms).
   - Sheet on < lg for lightweight create/edit flows.
   - Detail views requiring multiple confirmations become dedicated pages — never a dialog-over-dialog on any viewport.

### Scope Discipline

- Do only what the current phase demands. No future-phase work. No "while I'm here" cleanup.
- If the spec is ambiguous for the current phase, STOP and ask — do not guess.
- If a UI pattern is not defined in Phases 2A/2B primitives AND you need it, STOP and request the Phase 2A/2B extension before building the route.
- **Horizontal phases (7 and 9) span multiple sessions.** Phase 7 executes one management domain per session (HR → POS → Procurement → Inventory → Operations → Marketing → Maintenance → Shared wrappers = 8 sessions). Phase 9 executes guest routes in one session (9a) and Edge Functions in a separate session (9b). Each sub-session ends with its own STOP rule and pastes verification-gate evidence before proceeding.
- **Context failsafe for horizontal phases (6, 7, 8).** If at a STOP point between routes the assistant notes context pressure (responses shortening, spec re-reads becoming frequent, pattern drift in new code), the user may start a new session mid-phase with this prompt:

  ```
  Continue PHASE <N> at route <K> of <TOTAL>. The pattern is established
  in git history at src/features/<domain>/ and src/app/[locale]/(<portal>)/
  <prior-routes>/. Read those files before writing any new code.
  Next route: <path> per frontend_spec.md line <L>.
  ```

  Git history is the pattern memory, not chat history.

### End-of-Phase Protocol

Your final response for every phase MUST include a verification-gate checklist with `[PASS]` / `[FAIL]` per item and the exact shell output as evidence. If any gate is `[FAIL]`, do not claim completion.

---

## Phase 0 — Orientation & Manifest

**Objective:** produce a written, grep-verified inventory of what exists vs what must be built. No `src/` files are created or modified in this phase.

### Steps

1. Read in full, top-to-bottom: `CLAUDE.md`, `frontend_spec.md`, `operational_workflows.md`, `AGENTS.md`, `supabase/seed.sql`.
2. Skim-read: every file in `supabase/migrations/`. Keep a scratchpad of object names encountered.
3. Build and PRINT these four manifests as markdown tables:
   - **RPC manifest** — for every RPC named in `frontend_spec.md`'s route blocks and §9 RPC reference, grep the migrations. Mark `[OK] EXISTS` with `file:line`, or `[MISSING]`.
   - **Table manifest** — same methodology for every table referenced.
   - **View manifest** — same for every view.
   - **Edge Function manifest** — every Edge Function referenced. Mark whether a corresponding directory exists under `supabase/functions/` or `[MISSING]`.
4. Verify `src/types/database.ts` exists and was freshly generated — grep it for a uniquely-named recent table (e.g. `payment_webhook_events`). If absent, declare stale.
5. Run and PASTE output of: `supabase projects list` (cloud linkage check), `pnpm --version`, `node --version`, `pnpm ls next @supabase/ssr`. **Do NOT run `supabase status`** — this project uses Supabase Cloud, not a local stack; that command would incorrectly report "not running."
6. Verify `.env.local` has `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Do not print values; just presence.
7. Audit `frontend_spec.md` for a `§0 Design System Foundation` block. If absent, flag it — Phase 2 canonicalizes tokens/motion/primitives via this prompt regardless.

### Deliverable

Your response must contain, in this order:

- All four manifest tables
- A consolidated `[MISSING]` list (RPCs, tables, views, functions, env vars, or stale types)
- Explicit GO / NO-GO recommendation: "Safe to begin Phase 1" or "Stop — remediate the following first: ..."

### Stop Condition

- Any `[MISSING]` DB object → NO-GO. Ask the user how to remediate. Do NOT continue.
- Stale `types.ts` → NO-GO. Ask user to regenerate.

### Do Not

Write any `src/` file, initialize shadcn, or touch app code. This phase is observation only.

---

## Phase 1 — Database Readiness & Typed Clients

**Objective:** lock the DB layer. Login proves end-to-end for ONE user before any UI work begins. No `page.tsx` is created.

### Steps

1. **Do NOT run `supabase db reset`** — the project is on Supabase Cloud; `db reset` is destructive against cloud DB. Instead, verify the current cloud schema matches expectations by listing applied migrations: `supabase migration list --linked`. Paste full output. Every migration under `supabase/migrations/` should show as "applied" on remote.
2. `supabase gen types typescript --linked > src/types/database.ts` — paste file-size and first 20 lines for verification. **Use `--linked` (cloud), never `--local`** — there is no local Supabase stack running.
3. Create `scripts/smoke-login.ts` (throwaway): signs in as `it_admin@agartha.test / Password1!` via the JS client, reads `session.user.app_metadata.domains`, asserts `it`, `system`, `hr`, `reports`, `comms` keys present with correct CRUD values. Paste script + output.
4. Confirm `src/lib/env.ts` (already scaffolded) throws at module-load if required env is missing.
5. Create typed Supabase clients (all begin with `import "server-only";` where applicable):
   - `src/lib/supabase/server.ts` — cookie-bound SSR client
   - `src/lib/supabase/service.ts` — service-role, server-only
   - `src/lib/supabase/middleware.ts` — middleware factory
   - `src/lib/supabase/browser.ts` — client-side, no server-only
6. Create `src/lib/errors.ts` with the exact ErrorCode union from CLAUDE.md §4: `VALIDATION_FAILED | UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | CONFLICT | STALE_DATA | RATE_LIMITED | DEPENDENCY_FAILED | INTERNAL`. Export `ServerActionResult<T>` discriminated-union type.
7. Create `src/lib/logger.ts` — `pino` JSON logger with `request_id` + `user_id` context.
8. Create `src/lib/rate-limit.ts` — Upstash Redis token-bucket client.

### Verification Gates

Paste output for each:

- `pnpm typecheck` — zero errors.
- `pnpm build` — passes.
- `pnpm lint` — zero warnings (`--max-warnings=0`).
- `pnpm exec tsx scripts/smoke-login.ts` — prints the expected domains claim.
- `psql $DATABASE_URL -c "SELECT count(*) FROM public.profiles WHERE email LIKE '%@agartha.test';"` returns 19.

### Do Not

Create any `page.tsx`, `layout.tsx`, `middleware.ts`, or shadcn component yet.

---

## Phase 2A — Design Tokens & Shadcn Foundation

**Objective:** establish the token-driven visual vocabulary and the base shadcn primitive set. This is the first design-review gate. "Generic shadcn defaults" = phase failure.

### §A Design Tokens — `src/app/globals.css`

Write ONE stylesheet containing the complete token set. Every component consumes these variables; zero raw hex outside this file.

**Required token groups:**

1. **Brand scale:** `--brand-primary`, `--brand-primary-foreground`, `--brand-accent`, `--brand-accent-foreground`, plus numeric 50–900 scale for each.
2. **Semantic status tokens** matching the StatusBadge color map in `frontend_spec.md` §12s:
   - `--status-success` (emerald), `--status-warning` (amber), `--status-danger` (red), `--status-info` (blue), `--status-neutral` (zinc), `--status-accent` (violet)
   - Each with `-foreground`, `-border`, `-bg-soft`, `-bg-solid` variants.
3. **Surface tiers:** `--background`, `--surface`, `--card`, `--elevated`, `--overlay`.
4. **Text tiers:** `--foreground`, `--foreground-muted`, `--foreground-subtle`, `--foreground-disabled`.
5. **Border scale:** `--border`, `--border-strong`, `--border-subtle`.
6. **Radii:** `--radius-none: 0; --radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px; --radius-xl: 12px; --radius-2xl: 16px; --radius-full: 9999px;`
7. **Spacing:** 4px base unit (`--space-1: 4px` through `--space-24: 96px`).
8. **Typography scale (7 tiers with line-heights):**
   - `--text-xs: 12px/16px`, `--text-sm: 13px/18px`, `--text-base: 14px/20px`, `--text-lg: 16px/24px`, `--text-xl: 18px/28px`, `--text-2xl: 22px/32px`, `--text-3xl: 28px/36px`, `--text-4xl: 36px/44px`
   - Font stack: `--font-sans: "Inter", ui-sans-serif, system-ui, ...; --font-mono: "JetBrains Mono", ui-monospace, ...`
9. **Elevation:** `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`.
10. **Motion:**
    - Durations: `--duration-micro: 100ms`, `--duration-small: 200ms`, `--duration-layout: 300ms`
    - Easings: `--easing-standard: cubic-bezier(0.2, 0, 0, 1)`, `--easing-emphasized: cubic-bezier(0.3, 0, 0, 1)`, `--easing-exit: cubic-bezier(0.3, 0, 1, 1)`
11. **Breakpoints (documented, mirrored in Tailwind config):** `--breakpoint-sm: 640px` through `--breakpoint-2xl: 1536px`.
12. **Z-index scale:** `--z-dropdown: 1000 / --z-sticky: 1020 / --z-modal: 1040 / --z-popover: 1060 / --z-toast: 1080`.
13. **Full dark-mode overrides under `.dark` selector** — every token above redeclared with dark values.
14. Respect `prefers-color-scheme` on first load; persist user override in `NEXT_THEME` cookie.

### §B Tailwind Integration — `tailwind.config.ts`

Extend the Tailwind theme from CSS variables. Every Tailwind utility in components references a token (`bg-surface`, `text-foreground-muted`, `rounded-lg`, `shadow-md`), never hex.

Configure:

- `colors` mapped to `hsl(var(--color-name))`
- `fontFamily`, `fontSize`, `lineHeight`, `spacing`, `borderRadius`, `boxShadow`, `transitionDuration`, `transitionTimingFunction`, `zIndex` all mapped to CSS vars
- Container queries plugin, typography plugin

### §C Shadcn Primitives to Adopt

Run `pnpx shadcn@latest add` for ONLY this set, then patch each to consume tokens (replace generated hex/RGB with `var(--...)`):

```
button, input, label, select, checkbox, radio-group, switch, textarea, form,
dialog, sheet, tabs, tooltip, popover, dropdown-menu, command, table, badge,
card, skeleton, separator, avatar, calendar, sonner, scroll-area, alert,
alert-dialog, hover-card, breadcrumb, pagination
```

### §D Partial Kitchen Sink

Create `src/app/(dev)/kitchen-sink/page.tsx` gated by `process.env.NODE_ENV !== 'production'`. **Note:** this route is deliberately placed OUTSIDE the `[locale]` segment so it renders before Phase 3's i18n middleware exists. Phase 3 adds a middleware 404 gate for production. Render in both themes:

1. Typography scale (all 7 tiers, sans + mono)
2. Color tokens (swatches with hex + contrast ratio vs background)
3. Status tokens (all 6 status families × 4 variants)
4. Buttons (variant × size matrix)
5. Forms (every field type + error + disabled)
6. Dialogs + Sheets (sizing, focus trap demo)
7. Toasts (success, error, queued)
8. Theme toggle demonstrating light/dark parity

### §E Verification Gates

Paste evidence for each:

- `pnpm typecheck && pnpm build && pnpm lint` — all pass.
- `pnpm dev`, open `/kitchen-sink`. Describe top-to-bottom what renders in light and dark.
- `pnpm exec axe http://localhost:3000/kitchen-sink` → zero serious/critical a11y violations.
- **Contrast measurements:** list every body-text / UI-component token pair and its measured ratio (light + dark). Body ≥ 4.5:1; UI ≥ 3:1. Use `scripts/check-contrast.ts` (committed).
- **Lighthouse a11y ≥ 95, perf ≥ 90** on kitchen-sink.
- **Theme toggle test:** toggle light/dark 5x; no flash of unstyled content.
- **Responsive sanity:** kitchen sink renders at 375px, 768px, 1280px without overflow or truncation.

### Stop Rule

After delivering Phase 2A, wait for user review of kitchen-sink screenshots + contrast table + Lighthouse reports before Phase 2B. **This is design-review gate #1.** If anything is rejected, iterate — do NOT start Phase 2B.

### Do Not

Create any custom CVA primitive, motion helper, print stylesheet, or kitchen-sink section beyond those listed. Those are Phase 2B.

---

## Phase 2B — Custom Primitives, Motion & Print

**Objective:** the full primitive catalog that every downstream phase consumes. This is design-review gate #2.

### §D Custom CVA Primitives — `src/components/ui/`

Build the following, each CVA-governed, each exposed via `src/components/ui/index.ts`. Every one has `data-testid` pass-through, `Readonly` props, and full JSDoc.

1. **`kpi-card.tsx` + `kpi-card-row.tsx`** — value + label + trend + optional sparkline slot.
2. **`status-badge.tsx`** — full enum→color map: `booking_status`, `order_status`, `payment_status`, `incident_status`, `mo_status`, `po_status`, `leave_request_status`, `exception_status`, `employment_status`, `device_status`, `vehicle_status`, `lifecycle_status`. Plus `exception_type` overrides per spec §12s.
3. **`status-tab-bar.tsx`** — `nuqs`-driven tabs with counts, ARIA-compliant `role="tablist"` + keyboard arrow navigation.
4. **`data-table.tsx`** — `@tanstack/react-table` wrapper supporting:
   - Cursor pagination (high-volume) OR offset pagination (configurable)
   - Column visibility toggle (popover-based)
   - Density toggle (`compact` / `comfortable` / `spacious`)
   - Sticky header when scrolled
   - Row selection + `<BulkActionBar>` slot (appears when `selection.size > 0`)
   - Auto-virtualization via `@tanstack/react-virtual` when `rowCount > 100`
   - **Mobile collapse: < md renders as `<CardList>` using required `mobileFieldPriority: string[]` prop** (ordered top-to-bottom fields shown per card)
   - `<TableSkeleton>` sibling matching current column config
5. **`page-header.tsx`** — `{ title, description?, breadcrumbs?, primaryAction?, secondaryActions?, metaSlot? }`. Every feature route uses this; no route renders a raw `<h1>`.
6. **`breadcrumb.tsx`** — wraps shadcn/breadcrumb with typed `<Link>` integration.
7. **`empty-state.tsx`** — `variant: "first-use" | "filtered-out" | "error"`, each with distinct icon, copy slot, action slot.
8. **`error-state.tsx`** — dedicated for `error.tsx` files. Accepts `Error` + `reset` prop. Calls `captureException(error)` via `src/lib/telemetry.ts` on mount.
9. **`skeleton-kit.tsx`** — exports `<TableSkeleton rows cols />`, `<FormSkeleton fields />`, `<CardSkeleton />`, `<DetailSkeleton />`, `<StatsSkeleton />`. ALL downstream `loading.tsx` compose these.
10. **`command-palette.tsx`** — `cmdk`-based ⌘K dialog. Two groups: "Navigate" (routes filtered by user's domains) and "Actions" (registered via `registerCommand({ id, label, handler, scope })`). Auto-mounts in admin + management shells.
11. **`sidebar.tsx`** — three states: `expanded` (240px, default), `collapsed` (icon-only, 64px), `hover-expanded` (on-hover widens over content). Collapsed state persisted in `SIDEBAR_COLLAPSED` cookie. Hidden on < lg (replaced by sheet-based drawer).
12. **`bottom-tab-bar.tsx`** — mobile crew shell primitive. Touch targets ≥ 44×44. Hidden on ≥ md.
13. **`form-primitives.tsx`** — `<FormField>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`, `<FormSubmitButton>`. `<FormMessage>` renders field-level errors from both client Zod and server `ServerActionResult.fields`. `aria-invalid`, `aria-describedby` wired automatically. `<FormSubmitButton>` disables during `isSubmitting`, shows spinner.
14. **`toast-helpers.tsx`** — `toastSuccess(msg)`, `toastError(result: ServerActionResult)` (auto-formats error taxonomy), `toastQueued(msg)` (offline queue). All use `sonner`.

### §E Motion Helpers — `src/lib/motion.ts`

Export three canonical motion configs:

- `fadeIn({ duration: "micro" | "small" | "layout" })` → framer-motion variants
- `slideUp({ duration, distance? })`
- `stagger({ children, delay? })`

Every helper branches on `usePrefersReducedMotion()` and returns a no-op when set. **No raw `framer-motion` `<motion.div>` usage in feature code — always through a helper.**

### §F Print Stylesheet Framework — `src/styles/print.css`

Imported from `globals.css`. Defines `@media print`:

- Body: white bg, black text, 12pt base
- Utilities: `.no-print`, `.print-only`, `.page-break-before`, `.avoid-break`
- Page: `@page { size: A4; margin: 16mm; }` with `size: letter` fallback via `@supports`
- Route-scoped print rules added per consumer in later phases (booking confirmation, POS receipts, reports).

### §G Full Kitchen Sink

Extend `/kitchen-sink` with remaining sections:

9. Data Table (density toggle, column visibility, virtualization sample of 500 rows, bulk-action bar, mobile collapse demo at < md)
10. Empty / Error / Loading states (all three variants of each)
11. Command Palette (⌘K demo with mock commands)
12. Motion primitives (fadeIn, slideUp, stagger — with a "reduced motion" toggle demonstrating the branch)
13. Skeleton kit (all five skeletons)
14. PageHeader + Breadcrumb (every slot filled)
15. Print preview button on a sample receipt layout
16. Sidebar (all three states toggleable)
17. BottomTabBar (mobile-viewport preview)

### §H Verification Gates

- `pnpm typecheck && pnpm build && pnpm lint` — all pass.
- Kitchen sink at `/kitchen-sink` renders all 17 sections in light + dark.
- `axe` → zero serious/critical.
- **Responsive tests:** kitchen sink at 375px, 768px, 1024px, 1280px, 1920px — describe what shifts at each breakpoint.
- **Keyboard trace:** tab through every primitive; record any trap-failures or invisible focus rings. Zero allowed.
- **`prefers-reduced-motion` test:** OS motion reduction set, reload, confirm motion helpers produce no transforms.
- **Virtualization test:** 500-row DataTable sample scrolls smoothly on desktop and mobile Chromium.
- **Command palette test:** ⌘K opens; Escape closes; arrow keys navigate; Enter fires.
- **Print test:** browser Print Preview on sample receipt; A4 + Letter both correct.
- **Bundle baseline:** `@next/bundle-analyzer` on kitchen-sink route; report gzipped JS. Record baseline for Phase 10 comparison.
- **Lighthouse a11y ≥ 95, perf ≥ 90** on kitchen-sink.

### Stop Rule

Design-review gate #2. User must approve the full kitchen sink before Phase 3. If anything is rejected, iterate Phase 2B. Do NOT start Phase 3 on yellow.

### Do Not

Create any feature route, auth page, middleware, or portal shell. Those are Phase 3.

---

## Phase 3 — Core Infrastructure, Middleware, Auth, i18n, Observability

**Objective:** a user can log in as any of the 19 seeded staff; middleware routes them to the correct EMPTY portal shell. Permissions, domain gating, i18n, observability, rate-limiting, security headers — all wired at boot. No feature page exists yet.

### Deliverables

1. **Root layout `src/app/layout.tsx`:** providers — `QueryClientProvider` (explicit `staleTime` + `gcTime` defaults), `NuqsAdapter`, `ThemeProvider`, `next-intl` provider, Sentry boot, `<Toaster />`, global `<CommandPalette />` mount, Web Vitals reporter.
2. **`middleware.ts`** — full 6-gate tree from `frontend_spec.md` §7 (including Gate 5 domain-presence and Gate 6 MFA). Route manifest at `src/lib/rbac/route-manifest.ts`, one entry per portal route with `{ path, requiredDomain: { domain, access }, requiresMfa? }`. Derived from sidebar config in `frontend_spec.md` §8. Also: return 404 for `/kitchen-sink` when `NODE_ENV === 'production'`.
3. **i18n:** `next-intl` scaffolding with `/[locale]/...` routing; `en` + `ms` catalogs in `messages/`. Middleware rewrites bare paths to `/en/...`.
4. **Auth routes** under `src/app/[locale]/(auth)/...`:
   - `/auth/login` — email + password form using Phase 2B `<FormField>` + RHF + Zod; rate-limited via `rate-limit.ts`; calls `supabase.auth.signInWithPassword`. Renders `<PageHeader>` + branded card.
   - `/auth/set-password` — calls `rpc_confirm_password_set` (grep-verify first).
   - `/auth/not-started`, `/auth/access-revoked`, `/auth/on-leave` — middleware-driven static pages using `<EmptyState variant="first-use">`.
5. **Portal shell layouts** (empty content — just shell chrome):
   - `src/app/[locale]/(admin)/layout.tsx` — `<Sidebar>` + topbar. Sidebar collapses to drawer on < lg.
   - `src/app/[locale]/(management)/layout.tsx` — same pattern.
   - `src/app/[locale]/(crew)/layout.tsx` — `<BottomTabBar>` on < md, top bar on ≥ md.
   - `(guest)` and `(auth)` use minimal shells.
   - Navigation items render from route manifest filtered by user's domains.
6. **Minimal welcome pages:**
   - `/admin/it/page.tsx`, `/admin/business/page.tsx` — render `<PageHeader title="Welcome, {display_name}" />` from RSC query on authenticated profile.
   - `/management/page.tsx` — redirect to first domain the user holds.
   - `/crew/attendance/page.tsx` — placeholder; real implementation in Phase 4.
7. **Observability:** Sentry init (client + server) via `src/lib/telemetry.ts`, OpenTelemetry SDK, PostHog client, Web Vitals reporter. Each logs a "boot OK" line.
8. **Security headers:** full baseline from CLAUDE.md §3 in `next.config.ts`:
   - `Content-Security-Policy` (strict, nonce-based)
   - `Strict-Transport-Security`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` (deny by default, opt-in for camera/geolocation per route)

### Verification Gates

- `pnpm typecheck && pnpm build && pnpm lint` — all pass.
- Playwright `tests/e2e/smoke-auth.spec.ts` — log in as 5 roles (`it_admin`, `business_admin`, `human_resources_manager`, `fnb_crew`, `runner_crew`). Each lands on correct portal root. Each sees sidebar with ONLY permitted routes. **Every `test()` in this file is tagged `@smoke` in its title** (e.g., `test("login as it_admin @smoke", ...)`) so Phase 11's production-smoke gate can grep-select them via `--grep @smoke`.
- Playwright: `fnb_crew` hitting `/admin/it` → redirected to `/crew/attendance` (Gate 4) or 403 (Gate 5).
- Playwright: unauthenticated user hitting `/admin/it` → redirected to `/auth/login`.
- Playwright: `/kitchen-sink` in production-mode build → 404.
- Playwright: ⌘K opens command palette in admin + management shells; Escape closes; arrow keys navigate; Enter fires.
- Playwright mobile viewport (375×667): `fnb_crew` logged in sees `<BottomTabBar>`, not desktop sidebar.
- Playwright desktop viewport (1440×900): `it_admin` sees expanded `<Sidebar>`, not bottom tab bar.
- Browser devtools: CSP, HSTS, X-Frame-Options present on HTML responses.
- Sentry dashboard shows boot event.
- Submit wrong password 6 times → rate limiter rejects with 429.

### Do Not

Implement any feature page, data table beyond sidebar render, or Server Action beyond auth.

---

## Phase 4 — Vertical Slice: `/crew/attendance`

**Objective:** prove the full pattern — migration → RPC → typed client → Server Action → RSC query → Client leaf → tests — on ONE mobile-first crew page, using ONLY Phase 2A/2B primitives. If this doesn't ship clean, no horizontal scaling.

**Reference:** `frontend_spec.md` §6 `AttendancePage`, `operational_workflows.md` WF-5.

### Deliverables

1. `src/features/attendance/` — complete feature module per CLAUDE.md §1 (`components/`, `actions/`, `schemas/`, `queries/`, `types/`, `constants.ts`, `__tests__/`).
2. `src/components/shared/attendance-page.tsx` — Pattern A shared component (no props). Three tabs via `<StatusTabBar>` (`?tab=clock|exceptions|stats`).
3. Thin wrapper: `src/app/[locale]/(crew)/crew/attendance/{page.tsx,loading.tsx,error.tsx,not-found.tsx}` — nothing but `<AttendancePage />` + auth-guard check. `loading.tsx` composes `<TableSkeleton>` + `<StatsSkeleton>` — NO bespoke skeleton.
4. **Route segment config on `page.tsx`:** `export const dynamic = "force-dynamic"; export const revalidate = 0;` — attendance is user-specific and time-sensitive.
5. **`generateMetadata`** — dynamic title from user's shift date.
6. **Server Actions:** `clockInAction`, `clockOutAction`, `addClarificationAction`. Each calls an RPC grep-verified in migrations. Each follows the 8-step pipeline. Each returns `ServerActionResult<T>`. Post-response logging via `after()`.
7. **Queries:** `getTodayShift`, `getOwnExceptions`, `getMonthlyStats` — real Supabase queries with named column projections (no `select('*')`). Typed returns; explicit React Query `staleTime` + tag (`hr:attendance`, `hr:exceptions`).
8. **Forms** use Phase 2B `<FormField>` + RHF + Zod. Server errors route through `<FormMessage>` via `ServerActionResult.fields`. `<FormSubmitButton>` handles loading state.
9. **Toasts** use `toastSuccess` / `toastError` / `toastQueued`. No direct `sonner` imports in feature code.
10. **Motion:** tab transitions, form-submit animations use `src/lib/motion.ts`.
11. **Empty state:** when no shift scheduled, render `<EmptyState variant="first-use" />`, not inline "No shift found" text.
12. **Offline queue integration:** `clockInAction` / `clockOutAction` go through `src/lib/offline-queue.ts` (built here for the first time). IndexedDB backing, idempotency key, Service Worker `online` listener replays. Server dedup via `idempotency_keys` table. Queued mutations surface via `toastQueued()`.
13. **Mobile-first layout** — single column, large touch targets (≥ 44×44), primary CTA anchored bottom-100px band. Responsive upscale on ≥ md.
14. **Extend `playwright.config.ts`** (one-time) with 5 projects matching Master Preamble's canonical viewports:
    - `chromium-mobile` (375×667), `chromium-tablet-portrait` (768×1024), `chromium-tablet-landscape` (1024×768), `chromium-desktop` (1280×800), `chromium-wide` (1920×1080)
    - Visual-regression specs run across all 5; functional specs default to `chromium-desktop`.
15. **Tests:**
    - Vitest unit: Zod edge cases, error-taxonomy mapping, rate-limit rejection, optimistic-lock `STALE_DATA` path.
    - Vitest integration (RTL + MSW): render `AttendancePage` with mocked Server Action boundary; verify UI reacts to success / error / `RATE_LIMITED` / `STALE_JWT`.
    - Playwright E2E: log in as `fnb_crew`, visit `/crew/attendance`, clock in, cross-check `timecard_punches` row via DB, clock out, verify hours total. Second test: disable network → clock in → see "Queued" toast → re-enable network → verify sync + DB row.
    - Playwright a11y: `axe-core` scan, zero serious/critical.
    - Playwright visual regression: light + dark screenshots at all 5 canonical viewports (375, 768, 1024, 1280, 1920) per Master Preamble Responsive Strategy.

### Verification Gates

Paste output for every item:

- `pnpm test -- attendance` — all green; coverage ≥ 80% on `src/features/attendance/actions/`.
- `pnpm exec playwright test attendance` — all green.
- `pnpm typecheck && pnpm build && pnpm lint` — all green.
- Manual: clock in as `fnb_crew` on 375px viewport, hard-refresh, state persists. Re-verify at 1280px viewport.
- `grep -r "data-testid" src/features/attendance src/components/shared/attendance-page.tsx | wc -l` ≥ 15.
- **UI consistency audit:**
  - `grep -rE "(import.*framer-motion|className=.*transition-)" src/features/attendance` → only via `src/lib/motion.ts`
  - `grep -rE "#[0-9a-fA-F]{3,8}" src/features/attendance` → zero hex literals
  - `grep -rE "(Skeleton|NoDataFound|useState.*isLoading)" src/features/attendance` → zero bespoke
  - `grep -rE "\.select\(['\"]?\\*" src/features/attendance` → zero wildcard selects
- Lighthouse a11y ≥ 95, perf ≥ 90 on `/crew/attendance`.
- axe-core → zero serious/critical.
- `grep -r "revalidatePath" src/features/attendance` → zero. Only `revalidateTag('hr:attendance')` + `revalidateTag('hr:exceptions')`.
- Bundle: `/crew/attendance` ≤ 200KB gzipped (crew-mobile budget).

### Stop Rule

Paste all gates with `[PASS]` / `[FAIL]`. If any fail, iterate Phase 4 — do NOT start Phase 5. **Design-review gate #3:** share screenshots at all 5 canonical viewports (375 / 768 / 1024 / 1280 / 1920), light + dark; user approves the visual execution before horizontal scaling begins.

---

## Phase 5 — Cross-Portal Shared Components

**Objective:** implement the 6 cross-portal shared components from `frontend_spec.md` §6 + `/management/staffing`. Same rigor as Phase 4. One component at a time.

### Order (one commit per component; STOP after each)

1. `SettingsPage` — Pattern A
2. `AnnouncementsPage` — Pattern B (`mode` prop)
3. `IncidentLogPage` — Pattern B; groups derived from a single `MODE_TO_GROUPS` constant INSIDE the component
4. `DomainReportsPage` — Pattern C (server-injected `allowedReportTypes`)
5. `DomainAuditTable` — Pattern C (server-injected `allowedEntityTypes`)
6. `TodaysCrewGrid` consumed via `/management/staffing` (single route, `nuqs ?domain=`)

### Per-Component Checklist

Every item `[PASS]` before moving to the next:

- Read the relevant block in `frontend_spec.md` §6 verbatim before writing.
- Grep-verify every RPC, table, view, column referenced.
- **Phase 2A/2B primitives only.** If a new primitive type is needed, STOP and request a Phase 2A/2B extension.
- Real data only — no hardcoded arrays.
- Server Actions follow the 8-step pipeline; rate-limited; idempotency-keyed.
- `revalidateTag` with taxonomy tags only.
- Wrappers exist under `/admin/...`, `/management/...`, `/crew/...` where the spec requires.
- `data-testid` on every interactive element.
- Skeletons compose Phase 2B `skeleton-kit`; zero bespoke.
- Motion via `src/lib/motion.ts` only.
- Toasts via `toast-helpers.tsx` only.
- Unit + integration + E2E tests. Coverage ≥ 80% on component's actions.
- Responsive: shared components work in admin desktop + management desktop + crew mobile viewport (as applicable per spec).
- `pnpm test && pnpm exec playwright test && pnpm typecheck && pnpm build && pnpm lint` — all green.
- Lighthouse a11y ≥ 95, perf ≥ 90 on one route per wrapper.
- Grep for `framer-motion`, `sonner`, hex literals → zero direct usages.

### Stop Rule

After each component, print verification-gate checklist with `[PASS]`/`[FAIL]` and paste shell output. Wait for "proceed" before next component.

### Do Not

Touch any feature-specific route (e.g., `/admin/iam`, `/management/hr/*`). No refactoring of prior code.

---

## Phase 6 — Admin Portal (16 routes)

**Objective:** every admin route, desktop-first but fully responsive. One route at a time.

### Build Order (exact)

1. `/admin/it` (System Dashboard)
2. `/admin/iam`
3. `/admin/iam/[id]`
4. `/admin/devices`
5. `/admin/devices/[id]`
6. `/admin/zones`
7. `/admin/org-units`
8. `/admin/permissions`
9. `/admin/system-health`
10. `/admin/units`
11. `/admin/business` (Executive Dashboard)
12. `/admin/revenue`
13. `/admin/operations`
14. `/admin/costs`
15. `/admin/guests`
16. `/admin/workforce`

### Per-Route Checklist

Every item `[PASS]` before starting the next:

- Read the route's dedicated block in `frontend_spec.md` in full.
- Grep-verify every RPC, table, view, column, trigger referenced.
- RSC + Client leaf split per CLAUDE.md §3.
- **Route segment config:** `export const dynamic` + `export const revalidate` declared.
- **`generateMetadata`** exported.
- Every filter / tab / search / pagination uses `nuqs`.
- Every data table uses Phase 2B `<DataTable>` with required `mobileFieldPriority`.
- Virtualization auto-triggers at > 100 rows.
- Every aggregate uses a canonical VIEW (or single JOIN + GROUP BY).
- Every mutation follows the 8-step pipeline.
- Every cache invalidation uses `revalidateTag`.
- Real data only — zero hardcoded arrays.
- `data-testid` on every interactive element.
- `loading.tsx` composes Phase 2B skeletons only.
- `error.tsx` uses `<ErrorState>` + calls `captureException`.
- `not-found.tsx` for `[id]` routes uses `<EmptyState variant="first-use">`.
- Empty states use `<EmptyState>` with correct variant.
- Command palette registers the route's primary actions via `registerCommand`.
- Unit + integration + happy-path E2E + one RBAC-denied E2E.
- Real-time subscriptions use `useRealtimeChannel` with explicit filter + ≤ 2 channels + cleanup.
- **Responsive verification:** Playwright visual regression at 375, 768, 1024, 1280, 1920.
  - At 1280+: full admin desktop experience (sidebar expanded, tables show all columns).
  - At < md: sidebar collapses to drawer, tables collapse to card list via `mobileFieldPriority`, forms stack single-column, no horizontal scroll.
- `pnpm test && pnpm exec playwright test -- <route-slug> && pnpm typecheck && pnpm build && pnpm lint` — all green.
- **UI consistency audit:**
  - `grep -rE "#[0-9a-fA-F]{3,8}"` on route → zero
  - Direct `framer-motion` / `sonner` imports → zero
  - `useState.*isLoading`, bespoke `Skeleton`, inline "No data" strings → zero
  - `.select('*')` → zero
- Bundle delta ≤ 400KB gzipped (admin budget).
- Lighthouse a11y ≥ 95, perf ≥ 85.

### Stop Rule

After each route, print verification-gate checklist with `[PASS]`/`[FAIL]`, paste shell output, and screenshot descriptions at 375px + 1440px (light + dark). Wait for "proceed" before next route.

---

## Phase 7 — Management Portal (by domain)

**Objective:** every management route, grouped by domain. Desktop-first but fully responsive. One route at a time.

### Domain Order (exact)

1. HR — `/management/hr/*`
2. POS — `/management/pos/*`
3. Procurement — `/management/procurement/*`
4. Inventory — `/management/inventory/*`
5. Operations — `/management/operations/*`
6. Marketing — `/management/marketing/*`
7. Maintenance — `/management/maintenance/*`
8. Shared management wrappers — confirm `/management/{reports,audit,announcements,attendance,staffing,settings}` render correctly under the management shell.

### Per-Route Checklist

Identical to Phase 6. Management bundle budget: 350KB gzipped.

### Additional Cross-Domain Checks After Each Full Domain

- `grep -r "revalidatePath" src/features/<domain>` → zero hits.
- No duplicate RPC wrappers — shared logic in `src/features/<domain>/queries/` or `actions/`.
- Every route's `loading.tsx` composes Phase 2B primitives (screenshot the mid-fetch skeleton).
- Bundle per route ≤ 350KB.
- UI consistency audit greps → zero.

### Stop Rule

Same as Phase 6. Wait for approval between routes AND between domains.

---

## Phase 8 — Crew Portal & Offline Queue Hardening

**Objective:** every role-specific crew route, mobile-first with ≥ md upscale. Extends offline queue bootstrapped in Phase 4.

### Build Order (one at a time)

1. `/crew/pos`
2. `/crew/active-orders`
3. `/crew/entry-validation`
4. `/crew/restock`
5. `/crew/logistics/restock-queue`
6. `/crew/logistics/po-receiving`
7. `/crew/logistics/stock-count`
8. `/crew/disposals`
9. `/crew/maintenance/orders`
10. `/crew/schedule`
11. `/crew/leave`
12. `/crew/zone-scan`
13. `/crew/feedback`

### Offline Queue Contract

- `rpc_clock_in`, `rpc_clock_out` (done in Phase 4), plus `submit_pos_order`, `crew_zones INSERT`, `write_offs INSERT` all route through `offlineQueue`.
- Playwright `offline-queue.spec.ts`: start offline, invoke each of the 5 mutations, re-connect, assert every mutation landed in DB exactly once (idempotency enforced).
- Sync queue drawer visible in crew top bar with pending + failed buckets.

### Per-Route Checklist

Identical to Phase 6. Crew-mobile bundle budget: 200KB gzipped.

### Additional Crew-Specific Gates

- Touch target ≥ 44×44 CSS px, verified via Playwright measuring bounding boxes.
- Primary CTA anchored to viewport bottom on mobile (375×667; primary within bottom 100px band).
- Camera permission prompts fire on first use, not mount.
- QR scanner routes (`/crew/zone-scan`, `/crew/entry-validation`) tested with stubbed `navigator.mediaDevices.getUserMedia`.
- Camera / QR widgets loaded via `next/dynamic`.
- **Responsive verification:** crew routes at 375, 414, 768, 1024, 1440.
  - Primary experience is mobile (375-414).
  - At ≥ md, bottom tab bar moves to top bar; no functional loss.

### Stop Rule

Same as Phases 6-7.

---

## Phase 9 — Guest Flow & Edge Functions

**Objective:** public booking, guest-session management, biometric flow, survey — all with CSRF, rate limiting, production-grade webhooks. Mobile-first.

### Build Order (one route/function at a time)

1. `/book` — multi-step wizard. **State in `nuqs` URL params** (`?step=date|tier|attendees|review&expId=X&tierId=Y&date=...&adults=2&children=1`), NOT a client reducer. Deep-linkable state per CLAUDE.md §3; guests regularly refresh mid-flow. The `frontend_spec.md` block is superseded on this point.
2. `/book/payment`
3. `/my-booking`
4. `/my-booking/verify`
5. `/my-booking/manage`
6. `/my-booking/manage/biometrics` (BIPA/GDPR gates from `frontend_spec.md` + `operational_workflows.md` WF-7B)
7. `/my-booking/manage/memories`
8. `/survey`

### Edge Functions (under `supabase/functions/`)

**Important distinction before building:** pg_cron schedules (`cron-*`) and Edge Functions are different things. A cron schedule is SQL `cron.schedule(...)` in a migration; an Edge Function is TS code under `supabase/functions/*/index.ts`. A cron job may run pure SQL OR may invoke an Edge Function via `net.http_post`. When Phase 0 audits Edge Functions, only the 7 below count as Edge Functions. Names like `cron-biometric-retention`, `cron-booking-abandon`, `cron-payment-reconcile` in the spec are pg_cron schedule names — they're already implemented as SQL in migrations (see [phase2:418+](supabase/migrations/20260418000000_phase2_security_additions.sql) and [init_schema:6969+](supabase/migrations/20260417064731_init_schema.sql)). Do NOT create Edge Functions for them.

1. `confirm-booking-payment` — HMAC verification via `src/lib/payments/verify-webhook.ts` + idempotency via `payment_webhook_events` + `rpc_apply_payment_event`.
2. `reconcile-payments` — invoked by pg_cron schedule `cron-payment-reconcile` every 5 min. The cron schedule already exists in migrations; this phase builds the Edge Function it calls.
3. `send-email` — transactional email dispatcher (idempotent by `(template_key, booking_id)`).
4. `enroll-biometric` — service-role; strips raw image, extracts vector, inserts `consent_records` + `biometric_vectors` + `biometric_access_log` atomically.
5. `cron-employment-sync` — invoked by pg_cron schedule `employment-sync` (already scheduled in init_schema).
6. `cron-image-pipeline` — Storage object-created hook (not pg_cron); generates AVIF + WebP derivatives at 3 widths.
7. `generate-report` — invoked from `DomainReportsPage` (Phase 5).

### Guest-Specific Contracts

- **Double-submit CSRF:** `guest_csrf` httpOnly cookie + `x-guest-csrf` header, rotated on OTP verification and each mutation. Missing/mismatched → `FORBIDDEN`.
- Anonymous OTP routes rate-limited at 3/15 min/IP with CAPTCHA after 2 failures.
- No Supabase JWT on `/my-booking/manage/*` — Server Actions invoke service-role client after validating guest session cookie + CSRF.
- Face Pay consent gate blocks camera until `consent_records` row committed. Withdrawal synchronous via `rpc_withdraw_biometric_consent`.
- **Print stylesheets mandatory:** `/my-booking/confirmation` + `/my-booking/manage` receipts render correctly on A4 + Letter via `src/styles/print.css`.

### Verification Gates

Per route + function:

- Unit + integration + happy-path E2E + abuse-path E2E (expired OTP, missing CSRF, rate-limit, wrong HMAC).
- Payment webhook tested end-to-end with gateway sandbox + ngrok (or local HMAC stub).
- Reconciliation cron: simulate dropped webhook → wait 5 min → booking flips to confirmed.
- Abandonment sweep: `pending_payment > 15 min` → cancelled, `booked_count` decremented.
- **Deep-link test:** paste wizard URL `?step=review&...` into fresh browser session; wizard hydrates at step 4.
- **Refresh test:** at `/book` step 3, hard-refresh. State persists via URL.
- **Print test:** `/my-booking/confirmation` print preview matches design on A4 + Letter.
- `pnpm test && pnpm exec playwright test guest && pnpm typecheck && pnpm build && pnpm lint` — all green.
- Service-role key NOT in client bundles: `grep -r SUPABASE_SERVICE_ROLE_KEY .next/static/` → zero.
- Bundle per guest route ≤ 150KB gzipped.
- **Responsive verification:** all guest routes at 375, 414, 768, 1024, 1440.

### Stop Rule

Same as previous phases.

---

## Phase 10 — Production Hardening & Release Gate

**Objective:** take the app to release-gate readiness. Phase 11 handles platform wiring that turns merges into deploys. Zero `[FAIL]` permitted.

### Checklist

Each item requires evidence:

1. **Full test suite:** `pnpm test && pnpm exec playwright test` — 100% green. Paste last 50 lines.
2. **Coverage:** unit ≥ 80% on `src/lib/` and `src/features/*/actions/`; integration ≥ 60% on `src/features/*/components/`. Paste report.
3. **Contract tests:** every Zod schema round-trips `parse(stringify(generate()))` in a test.
4. **Accessibility:** `pnpm exec playwright test --grep @a11y` runs axe on every critical route; zero serious/critical. Lighthouse a11y ≥ 95 on every route.
5. **Performance:**
   - Lighthouse perf ≥ 90 guest routes, ≥ 85 portal routes.
   - Bundle per route within budgets (§14): guest 150KB, crew-mobile 200KB, management 350KB, admin 400KB.
   - Queries > 50ms carry `EXPLAIN ANALYZE` in commit history.
6. **Security:**
   - `pnpm audit --audit-level=high` → zero.
   - Semgrep (`r/javascript.lang.security`) → zero.
   - `gitleaks` → zero.
   - CSP report-only mode for 24h; paste report.
   - File upload virus scan verified with EICAR test file.
7. **Observability:**
   - Deliberate error in staging → Sentry receives it with redacted `user_id`.
   - OpenTelemetry trace visible for one booking + one clock-in end-to-end.
   - PostHog events firing for `booking_created`, `pos_order_submitted`, `clock_in`.
8. **Data discipline greps:**
   - `grep -r "revalidatePath" src/` → zero hits outside explicitly-justified locations.
   - `grep -rE "const [A-Z_]+ ?= ?\[" src/features/ src/components/` → zero.
   - `grep -r "console.log" src/` → zero.
   - `grep -r ": any" src/` → zero.
   - `grep -rE "^export default function " src/` → zero outside `src/app/` + `middleware.ts`.
9. **UI consistency audit (final):**
   - `grep -rE "#[0-9a-fA-F]{3,8}" src/features/ src/components/ src/app/` → zero hex.
   - `grep -rE "from ['\"]framer-motion['\"]" src/features/ src/components/` → zero direct imports.
   - `grep -rE "from ['\"]sonner['\"]" src/features/ src/components/` → zero direct imports.
   - `grep -rE "className=.*bg-\[#" src/` → zero arbitrary color classes.
   - Every `loading.tsx`: `grep -L "Skeleton" src/app/**/loading.tsx` → empty.
   - See [Appendix A](#appendix-a--verification-grep-checks) for the full grep list.
10. **Dev/test artifacts removed:**
    - `/kitchen-sink` deleted.
    - `scripts/smoke-login.ts` deleted.
    - `supabase/seed.sql` excluded from production build/deploy pipeline (CI config documents this).
11. **Docs (`docs/`):**
    - ADRs: source-of-truth precedence, middleware gate layering, offline-queue design, webhook-idempotency pattern, tag-taxonomy cache strategy, biometric consent model, design-system token contract, responsive strategy.
    - Runbooks: Supabase outage, payment gateway outage, stale-JWT storm, stuck `pending_payment` orphans, biometric retention failure, image pipeline backlog.
    - `CHANGELOG.md` via `changesets`.
    - `README.md` with setup commands + 19 test accounts.
12. **CI (GitHub Actions):** typecheck, lint, unit, integration, e2e, axe, lighthouse-ci, Semgrep, gitleaks, bundle-size, license-check — all green on `main`.
13. **Release readiness:**
    - Staging deploy smoke-tested with real Supabase remote DB.
    - Feature flags exist for risky paths (explicit list).
    - Rollback plan documented.
    - DORA baseline captured.

### Release Gate

Every item `[PASS]` with evidence. If any `[FAIL]`, output numbered remediation plan and STOP — do not declare release-ready.

---

## Phase 11 — Deployment Wiring

**Objective:** wire the feature-complete app to GitHub + Supabase + Vercel so merges to `main` auto-apply migrations, deploy Edge Functions, and ship builds. Preview PRs get ephemeral Supabase branches + Vercel preview URLs. Failed deploys auto-rollback per CLAUDE.md §13.

**Prerequisite:** Phase 10 release gate is `[PASS]`.

### §A GitHub Repository Hardening

1. **Branch protection on `main`** (via `gh api` or UI; document chosen method):
   - Require PR before merge
   - Require 1 approving review (2 for payments / biometrics / auth paths per CODEOWNERS)
   - Require status checks: `typecheck`, `lint`, `unit`, `integration`, `e2e`, `axe`, `lighthouse-ci`, `semgrep`, `gitleaks`, `bundle-size`
   - Require signed commits
   - Require linear history (rebase merges only)
   - Dismiss stale approvals on new commits
   - Block force-pushes to `main`
2. **GitHub secrets** (Settings → Secrets and variables → Actions):
   - `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`
   - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
3. **Dependabot + CodeQL** via `.github/dependabot.yml` + GitHub security settings.
4. **`CODEOWNERS`** — payment / biometric / auth / migration paths require two reviewers.

### §B Vercel Project Setup

1. Install Vercel CLI: `pnpm add -g vercel`.
2. `vercel link` → select or create the `agartha-world-os` project (creates git-ignored `.vercel/project.json`).
3. Install the **Vercel GitHub App** on `esamjouda26/agartha-world-os` for zero-config preview + production deploys. **Do NOT build a custom GitHub Action for Vercel deploy.**
4. Provision env vars via `vercel env add <KEY> production` for:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `PAYMENT_WEBHOOK_SECRET`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
   - `CRON_SECRET`, `RESEND_API_KEY`
5. Repeat for `preview` scope (uses staging Supabase project or branch DB).
6. `vercel.json` for region + supplementary security headers:
   ```json
   {
     "regions": ["sin1"],
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "Permissions-Policy",
             "value": "camera=(self), geolocation=(self), microphone=()"
           }
         ]
       }
     ]
   }
   ```

### §C Supabase CI/CD

1. **Migrations workflow** `.github/workflows/supabase-migrate.yml`:
   ```yaml
   name: Supabase — apply migrations
   on:
     push:
       branches: [main]
       paths: ["supabase/migrations/**"]
   jobs:
     apply:
       runs-on: ubuntu-latest
       environment: production
       steps:
         - uses: actions/checkout@v4
         - uses: supabase/setup-cli@v1
           with: { version: latest }
         - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
           env:
             SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
             SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
         - run: supabase db push --linked
           env:
             SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
             SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
   ```
2. **Functions workflow** `.github/workflows/supabase-functions.yml` — matrix strategy deploying all Edge Functions in parallel on merge.
3. **Function secrets:**
   ```
   supabase secrets set PAYMENT_WEBHOOK_SECRET=... --project-ref $REF
   supabase secrets set RESEND_API_KEY=... --project-ref $REF
   ```
   Document in `docs/runbooks/function-secrets.md`.
4. **Supabase branching** for PR previews (paid tier):
   - Dashboard → Branching → Enable
   - Dashboard → GitHub → Connect repo
   - Every PR gets a branch DB; Vercel preview picks it up via `NEXT_PUBLIC_SUPABASE_URL` override.
   - Fallback: single `staging` Supabase project, documented in `docs/adr/NNNN-staging-env.md`.

### §D Sentry Release Automation

GitHub Action `.github/workflows/sentry-release.yml` creates a Sentry release per merge to `main` with source maps uploaded. Production errors deep-link to TypeScript source, not minified JS.

### §E Rollback Drill

1. Deploy a deliberate breakage to staging. Verify:
   - Sentry captures within 30s.
   - Vercel deployment health flags the issue.
   - Auto-rollback fires (if configured) OR manual rollback works (`vercel rollback` or UI one-click).
2. Document in `docs/runbooks/rollback.md`:
   - Detection criteria (error-rate spike, p95 latency spike)
   - Manual rollback sequence
   - Post-rollback verification
   - Stakeholder notification template
3. **Migration rollback drill** (DB rollback, distinct from app rollback):
   - Author a breaking migration in a feature branch (e.g., `DROP COLUMN`, `ALTER TABLE ... SET NOT NULL` without backfill).
   - Verify CI blocks the PR — either via a migration linter step or the PR template checkbox for "reversible (expand/contract)".
   - Replace with an expand/contract sequence: add-nullable → backfill (batched) → contract to NOT-NULL or drop-original, in three sequential migrations. Confirm each step is individually reversible via a down-migration file at the same timestamp.
   - Document in `docs/runbooks/migration-rollback.md`: how to identify a bad deployed migration; exact `psql` / `supabase` commands to reverse it; when to restore from PITR (Point-in-Time Recovery, 30-day window per CLAUDE.md §16) vs forward-fix with a new compensating migration; recovery time objective (RTO) per scenario.

### §F DORA Baseline

Record in `docs/metrics.md`:

- Deploy frequency (target: daily once team grows)
- Lead time for changes (target ≤ 24h PR-to-prod)
- Change-failure rate (target ≤ 15%)
- MTTR (target ≤ 1h)

### Verification Gates

- **Branch protection:** `gh api repos/esamjouda26/agartha-world-os/branches/main/protection` returns expected JSON.
- **Secrets:** `gh secret list` shows required set.
- **Vercel linked:** `cat .vercel/project.json` shows correct `orgId` + `projectId`.
- **Vercel env vars:** `vercel env ls` shows every key in both `production` and `preview`.
- **Migration workflow:** merge no-op migration; watch Actions; paste green check + run URL.
- **Functions workflow:** touch one function; merge; watch matrix; paste success.
- **Vercel deploy:** merge this phase; paste deployment URL + "Ready" status.
- **Production smoke:**
  ```cmd
  PLAYWRIGHT_BASE_URL=https://agartha-world-os.vercel.app pnpm test:e2e -- --grep @smoke
  ```
  All green.
- **Sentry release:** dashboard shows latest commit SHA with source maps. Deliberate error surfaces with TypeScript stack trace.
- **Rollback drill:** recorded + documented.
- **DORA baseline:** `docs/metrics.md` shows initial values + capture date.

### Stop Rule

No soft launches before every gate is `[PASS]`. Document gaps in `docs/adr/NNNN-deployment-gap.md` if any remain open.

### Do Not

- Commit `.vercel/project.json` (git-ignored).
- Embed env values in workflow YAML (use `${{ secrets.X }}`).
- Force-push to `main` (branch protection should reject it).
- Deploy Edge Functions manually once CI is live (skips audit trail).
- Skip the rollback drill.

### End State

- PR opened → Vercel preview URL + Supabase branch DB auto-provisioned
- PR merged → migrations + functions deploy → Vercel production deploy → Sentry release → smoke test runs
- Failed deploy → auto-rollback (or one-click manual)
- Every change has commit → PR → deploy → release → Sentry audit trail
- DORA baseline captured for future improvement

**"Merges become deploys."** Shipping speed is bounded only by review + test-suite execution, not by operator bandwidth.

---

## Appendix A — Verification Grep Checks

Run at Phase 10 and every subsequent PR. Zero-tolerance gates.

### Anti-Patterns

```bash
# Hardcoded data
grep -rE "const [A-Z_]+ ?= ?\[" src/features/ src/components/    # → zero

# Raw hex colors outside globals.css
grep -rE "#[0-9a-fA-F]{3,8}" src/features/ src/components/ src/app/    # → zero

# Arbitrary Tailwind color classes
grep -rE "className=.*bg-\[#" src/    # → zero

# Direct motion imports (must go through src/lib/motion.ts)
grep -rE "from ['\"]framer-motion['\"]" src/features/ src/components/    # → zero

# Direct sonner imports (must go through toast-helpers.tsx)
grep -rE "from ['\"]sonner['\"]" src/features/ src/components/    # → zero

# Typescript escape hatches
grep -r ": any" src/    # → zero
grep -r "@ts-ignore" src/    # → zero (use @ts-expect-error with linked issue)
grep -r "console.log" src/    # → zero

# Wildcard selects
grep -rE "\.select\(['\"]?\\*" src/    # → zero

# Sync params in Next 15+ pages
grep -rE "params: \{" src/app/**/page.tsx    # → every match shows `Promise<...>`

# useEffect data-fetching
grep -rE "useEffect\(.*fetch\(|useEffect\(.*supabase\." src/    # → zero

# Raw Date in props / JSON
grep -rE "new Date\(|Date\.now\(\)" src/features/ src/components/    # → review each

# Missing caching declarations
grep -rE "^export const (dynamic|revalidate) =" src/app/**/page.tsx | wc -l
# → equals count of page.tsx files

# Untyped href (bypassing typed routes)
grep -rE "href=\"/" src/    # → zero

# Default exports outside framework requirements
grep -rE "^export default function " src/    # → zero outside src/app/ + middleware.ts
```

### Required-Pattern Presence

```bash
# Every loading.tsx composes a Phase 2B skeleton
grep -L "Skeleton" src/app/**/loading.tsx    # → empty (no files without "Skeleton")

# Every Server Action uses ServerActionResult
grep -L "ServerActionResult" src/features/**/actions/*.ts    # → empty

# Every error.tsx reports to Sentry
grep -L "captureException" src/app/**/error.tsx    # → empty

# Every exhaustive switch asserts never
grep -rE "switch \(" src/features/    # → every hit paired with assertNever default
```

---

## Appendix B — Library Quick Reference

| Library         | Installed Package                                            | Usage Anchor                            |
| --------------- | ------------------------------------------------------------ | --------------------------------------- |
| Next.js         | `next@16+`                                                   | `src/app/**/*`                          |
| Supabase SSR    | `@supabase/ssr`                                              | `src/lib/supabase/`                     |
| Supabase JS     | `@supabase/supabase-js`                                      | via clients in `src/lib/supabase/`      |
| Validation      | `zod`                                                        | `src/features/**/schemas/`              |
| Forms           | `react-hook-form` + `@hookform/resolvers/zod`                | `src/components/ui/form-primitives.tsx` |
| URL state       | `nuqs`                                                       | every filter/tab/search                 |
| Server state    | `@tanstack/react-query`                                      | `src/features/**/queries/`              |
| Tables          | `@tanstack/react-table` + `@tanstack/react-virtual`          | `src/components/ui/data-table.tsx`      |
| UI primitives   | `shadcn-ui`                                                  | `src/components/ui/`                    |
| Icons           | `lucide-react`                                               | all components                          |
| Toasts          | `sonner` via `toast-helpers.tsx`                             | feature components                      |
| Motion          | `framer-motion` via `src/lib/motion.ts`                      | feature components                      |
| Command palette | `cmdk` via `command-palette.tsx`                             | admin + management shells               |
| Date/time       | `date-fns`                                                   | everywhere                              |
| i18n            | `next-intl`                                                  | `messages/*.json`                       |
| Logger          | `pino`                                                       | `src/lib/logger.ts`                     |
| Rate limit      | `@upstash/ratelimit` + `@upstash/redis`                      | `src/lib/rate-limit.ts`                 |
| Error tracking  | `@sentry/nextjs` via `src/lib/telemetry.ts`                  | everywhere                              |
| Feature flags   | `posthog-node` + `posthog-js` via `src/lib/feature-flags.ts` | feature components                      |

---

## Appendix C — Breakpoint & Viewport Reference

### Canonical Breakpoints (Tailwind + CSS variables)

| Name  | CSS Variable       | Pixel Value | Primary Device Class            |
| ----- | ------------------ | ----------- | ------------------------------- |
| `sm`  | `--breakpoint-sm`  | 640px       | Large phone / phablet           |
| `md`  | `--breakpoint-md`  | 768px       | Tablet portrait                 |
| `lg`  | `--breakpoint-lg`  | 1024px      | Tablet landscape / small laptop |
| `xl`  | `--breakpoint-xl`  | 1280px      | Desktop                         |
| `2xl` | `--breakpoint-2xl` | 1536px      | Large desktop                   |

### Playwright Visual Regression Viewports

Every route tested at all 5:

| Viewport       | Width  | Height | Persona          |
| -------------- | ------ | ------ | ---------------- |
| iPhone SE      | 375px  | 667px  | Small phone      |
| iPad portrait  | 768px  | 1024px | Tablet           |
| iPad landscape | 1024px | 768px  | Tablet landscape |
| Desktop        | 1280px | 800px  | Standard desktop |
| Wide           | 1920px | 1080px | Large monitor    |

### Portal-Viewport Expectations

| Portal     | 375px experience                                  | 1440px experience                                           |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------- |
| Admin      | Drawer nav, card-list tables, single-column forms | Expanded sidebar, full tables, multi-column forms           |
| Management | Same as Admin                                     | Same as Admin                                               |
| Crew       | Bottom tab bar, large CTAs, thumb-zone primary    | Top bar, side-by-side form fields, density gain             |
| Guest      | Centered narrow container, prominent single CTA   | Centered wider container, same hierarchy                    |
| Auth       | Centered card, `max-w-md`                         | Same card, optionally centered with marketing panel on side |
