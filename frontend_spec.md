# AgarthaOS — Frontend Route Map & UI Architecture Specification

> Source of truth: `init_schema.sql` (schema), `operational_workflows.md` (WF-0 through WF-20).
>
> **Authorization model:** Domain-based RBAC. Three layers:
>
> 1. **Portal routing** — `access_level` from JWT (`admin` | `manager` | `crew`) determines shell layout
> 2. **Feature visibility** — `domains` from JWT determines sidebar items and action buttons
> 3. **Data scoping** — `org_unit_path` (ltree) from JWT determines which rows are visible
>
> **UI/UX constraints:**
>
> - Admin/Management: desktop-first. Crew/Guest: mobile-first. All fully responsive.
> - Portal shell (desktop >= md): collapsible sidebar (full labels / icon-only, persisted in localStorage) + slim topbar (page title + notification bell).
> - Portal shell (mobile < md): slim topbar + fixed bottom tab bar. If items exceed 5, 5th tab = "More" bottom sheet. No hamburger drawer.
> - Guest shell: minimal header with back button, no nav bar. Full-bleed content.
> - Auth shell: centered card, no navigation.
> - In-page tabs (Shift Scheduling, Leave Management, Work Orders, Experience Config, Attendance, etc.): rendered as horizontal tab bar at the top of the content area, inside the page — NOT as sidebar sub-items or separate routes. Tab state driven via nuqs URL search param (`?tab=value`). Browser back/forward navigates between tabs. Instant switch — no page reload.
>
> **Responsive content area rules (apply to ALL routes — do not repeat per-route):**
>
> When a route detail block says "data table," "card grid," or "form," the builder MUST apply these portal-specific rendering rules:
>
> | Pattern in spec      | Admin/Management (desktop-first)                                                                                                                                                 | Crew (mobile-first)                                                                                                                 | Guest (mobile-first)                                                                                                     |
> | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
> | "data table"         | `@tanstack/react-table` with column visibility toggles. On mobile (< md): collapse to card list — each row becomes a stacked card showing 3-4 key fields, tap to expand full row | Card list by default. Table only on tablet (≥ md) landscape. Each card shows key fields with action buttons right-aligned           | N/A — guest routes do not use data tables                                                                                |
> | "form"               | Horizontal field groups (2-3 fields per row) in side panel or page section                                                                                                       | Vertical single-column stack, full-width inputs, large tap targets (min 44px). Primary action button anchored to bottom of viewport | Vertical single-column stack, full-bleed. Step-per-screen for multi-step flows. Primary action button anchored to bottom |
> | "KPI row"            | Horizontal card row, 3-5 cards                                                                                                                                                   | Horizontal scroll strip (2 visible + peek), or 2×2 grid                                                                             | N/A — guest routes do not show KPI cards                                                                                 |
> | "card grid"          | CSS grid, 3-4 columns                                                                                                                                                            | Single column stack, full-width cards                                                                                               | Single column stack                                                                                                      |
> | "Sheet / slide-over" | Right-anchored panel, 400-500px wide                                                                                                                                             | Full-screen bottom sheet, drag-to-dismiss                                                                                           | Full-screen bottom sheet                                                                                                 |
> | "tabs"               | Horizontal tab bar, all tabs visible                                                                                                                                             | Scrollable tab bar if > 3 tabs. Or segmented control for 2-3 options                                                                | Scrollable tab bar or step indicator                                                                                     |
> | "modal / dialog"     | Centered dialog, max 600px                                                                                                                                                       | Full-screen sheet rising from bottom                                                                                                | Full-screen sheet                                                                                                        |
>
> **Touch targets:** Crew and guest routes — all interactive elements (buttons, links, checkboxes, dropdown triggers) must meet 44×44px minimum tap area. Admin/management routes follow standard desktop sizing (32px min) with mobile breakpoint scaling.
>
> **Primary action anchoring:** On crew and guest routes, the main page action (Clock In, Submit Order, Confirm Booking, Submit Form) is a full-width button anchored to the bottom of the viewport, always visible above the bottom tab bar. It does NOT scroll with page content.
>
> **Camera/device access:** Routes requiring camera (`/crew/pos` selfie, `/crew/attendance` selfie, `/crew/zone-scan` QR, `/my-booking/manage/biometrics` face capture) must request permissions progressively — prompt on first use of the feature, not on page load. Show a placeholder with "Enable Camera" button, not a browser permission dialog on mount.
>
> **Loading states:** Every route with RSC data fetching MUST have a `loading.tsx` sibling displaying skeleton placeholders matching the page's layout (KPI card row shimmers + table row shimmers). Crew routes use full-screen centered spinner for simple pages.
>
> **Date/time display format:** All dates display as `DD MMM YYYY` (e.g., `17 Apr 2026`). All times display as `h:mm A` (12-hour with AM/PM). Date inputs use native pickers — submitted as ISO 8601. Relative timestamps (e.g., "2 hours ago") used for recency indicators on audit logs, announcements, and incident reports.
>
> **Implementation contracts (apply to every route — non-negotiable):**
>
> - **Type source of truth:** Types MUST be generated via `supabase gen types typescript`. Zod schemas MUST infer from generated DB types (`Database['public']['Tables'][T]['Row']`). Manual type duplication is forbidden.
> - **Server-only barrier:** All files under `src/features/*/queries/`, `src/features/*/actions/`, and any module performing server-side DB access or referencing secrets MUST begin with `import "server-only";`.
> - **Server Action pipeline (mandatory order for every mutation):** (1) `schema.safeParse(input)` — reject on failure. (2) Verify `auth.uid()` and RBAC claims server-side. (3) Execute mutation via Supabase JS or typed RPC. (4) Return a discriminated union `{ success: true, data: T } | { success: false, error: string }` — never leak raw SQL errors to the client. (5) Invalidate cache per [**ADR-0006**](docs/adr/0006-cache-model.md) — RLS-scoped reads use React `cache()` + surgical `revalidatePath(path, "page")` iteration over per-feature path lists (e.g. `ATTENDANCE_ROUTER_PATHS`); `revalidatePath("/", "layout")` is FORBIDDEN; `revalidateTag` / `updateTag` are RESERVED (only pair with `unstable_cache`-wrapped non-RLS reads).
> - **Forms:** All forms MUST use `react-hook-form` integrated with `@hookform/resolvers/zod`. A single Zod schema validates both client form state and the Server Action input.
> - **Database expressions in this spec:** Any SQL-like fragments (`WHERE status = '...'`, `SUM(...)`, `JOIN`, `DISTINCT ON`, `GROUP BY`) are **intent specifications only**. Implementation MUST use the Supabase JS query builder or strictly-typed RPCs. Raw SQL strings in application code are forbidden.
> - **Test anchors:** Every interactive element (button, link, input, tab trigger, row action, menu item, dialog control, form field) MUST carry a stable `data-testid` attribute. Naming convention: `{domain}-{component}-{action}` (e.g., `iam-request-approve-btn`, `leave-table-row`, `pos-catalog-item`).
> - **Route folder contents:** Every route folder MUST contain `page.tsx`, `loading.tsx`, and `error.tsx`. Dynamic `[id]` route folders MUST additionally contain `not-found.tsx`. `loading.tsx` renders a skeleton matching the page layout. `error.tsx` renders a recoverable error boundary with a reset action. `not-found.tsx` renders when the dynamic resource does not exist or is scoped out by RLS.
> - **Overlay discipline:** Modal-over-modal and sheet-over-sheet are forbidden. Detail views that require confirmation dialogs MUST be rendered as dedicated pages, not Sheets. Sheets are reserved for lightweight create/edit forms with no nested confirmation flow.
> - **Guest session security & CSRF:** Guest-authenticated routes (`/my-booking/manage/*`) use a custom session cookie (`httpOnly`, `secure`, `sameSite=strict`, `path=/my-booking/manage`, `maxAge=4h`) instead of a Supabase JWT. Every mutation invoked from a guest-session route MUST verify a **double-submit CSRF token**: a cryptographically random value stored both in an `httpOnly` cookie (`guest_csrf`) and echoed in an `x-guest-csrf` request header (fetch calls) or a hidden form field (form actions). Token is issued on successful OTP verification, rotated on each mutation, and scoped to the session. Server Actions MUST reject requests with missing, expired, or mismatched tokens with `FORBIDDEN`. Anonymous public routes (`/book`, `/my-booking`, `/my-booking/verify`, `/survey`) use the same double-submit pattern with an anonymous token minted on page load.
> - **File upload security (applies to every upload route — selfies, photo proofs, incident attachments, write-off photos, captured photos, avatars):**
>   - MIME validated on the **server** via file signature (magic bytes). Client-declared `Content-Type` and file extension are never trusted.
>   - Per-type size caps enforced server-side: images ≤ 5 MB, generic attachments ≤ 15 MB. Larger uploads rejected before persistence.
>   - Server-side virus scan (ClamAV or equivalent cloud service) runs before the object is marked readable; infected objects are quarantined and the uploader audited.
>   - Storage returns only **signed URLs with TTL ≤ 15 min**. Public buckets are forbidden for any user-supplied content.
>   - Storage bucket RLS policies MUST mirror the RLS of the owning row (path convention: `<bucket>/<owner_id>/<resource_id>/<uuid>.<ext>`). Direct bucket writes from Client Components are forbidden — all uploads go via a Server Action that returns a short-lived signed upload URL bound to the caller's identity.
>   - Authorized buckets (exact names + policies defined in `init_schema.sql` §23):
>     - `avatars` — public read, owner-folder write; user profile pictures; 2 MB; `image/*` only.
>     - `attendance` — private, owner-folder write, owner or `hr:r` read; clock-in/out selfies; 5 MB; `image/*` only.
>     - `attendance-clarifications` — private, owner-folder write, owner or `hr:r` read; medical certificates / receipts / photos attached to exception clarifications (ADR-0007); 10 MB; `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`. **No UPDATE or DELETE policies — append-only (PDPA retention).**
>     - `catalog` — public read, `pos:c|u|d` write; POS menu item imagery; 5 MB; `image/*` + svg.
>     - `operations` — private, any authenticated write, owner or `ops:r` read, `system:d` delete; incident attachments, write-off photos, maintenance photos, auto-captured guest photos; 10 MB; `image/*`, `video/mp4`, `application/pdf`.
>     - `documents` — private, `system:c|u|d` write, all authenticated read; contracts, policy PDFs, system documents; 10 MB.
>     - `reports` — private, `reports:r` read, `system:d` delete; generated export files; 50 MB; `csv`, `pdf`, `xlsx`.
>       Adding a bucket requires a migration + an ADR. Using a bucket outside its documented purpose is FORBIDDEN — the RLS policies are tuned to the purpose.
>   - EXIF stripping is mandatory on image uploads (prevents GPS/PII leakage).
> - **Sensitive-capture compliance (biometrics, payment, data involving minors):** Capture of biometric templates, payment credentials, or media of minors requires explicit, **timestamped, withdrawable** consent recorded in `consent_records` (`subject_id`, `subject_type`, `consent_type`, `legal_basis`, `purpose`, `retention_policy`, `granted_at`, `withdrawn_at`, `ip_address`, `user_agent`, `policy_version`). The consent UI MUST state: what is captured, why, legal basis, retention window, withdrawal path, and controller contact. Capture does not proceed until the consent row is committed. Withdrawal cascades synchronously to deletion of the captured data.
> - **Realtime subscription discipline:** Any Supabase Realtime subscription MUST: (1) carry a `filter:` clause scoped to the user's data domain (e.g., `staff_record_id=eq.${uid}`, `location_id=in.(${allowedLocationIds})`) — unscoped whole-table subscriptions are FORBIDDEN; (2) attach on mount and detach on unmount via `useEffect` cleanup returning `supabase.removeChannel(channel)`; (3) be created through a shared `useRealtimeChannel` wrapper hook that enforces **≤ 2 channels per route** and **≤ 8 channels per browser session** — above the ceiling the hook throws at dev time and silently drops in prod; (4) share a single `supabase` client instance — never instantiate a new client per hook; (5) disconnect after 5 min of tab inactivity (Page Visibility API) and reconnect on focus. The wrapper hook is canonical — direct `supabase.channel(...)` usage outside it is FORBIDDEN.
> - **Aggregate query discipline (N+1 elimination):** Any RSC or query that lists a parent with derived aggregate fields per row (e.g., "today's order count per POS point", "open-PO count per supplier", "exception count per staff") MUST resolve the aggregate via: (a) a single JOIN with `GROUP BY`, (b) a PostgreSQL VIEW (`v_<entity>_<metric>`, e.g., `v_pos_point_today_stats`, `v_supplier_open_po_stats`, `v_staff_exception_stats`) colocated in `supabase/migrations/`, or (c) a JSONB aggregate returned by the parent RPC. Per-row loop queries in application code are FORBIDDEN. PR reviewers MUST reject aggregate-per-row patterns.
> - **Cache invalidation taxonomy — AMENDED BY [ADR-0006](docs/adr/0006-cache-model.md):** RLS-scoped reads (almost everything the app does today) use React `cache()` — request-scoped dedup — and are invalidated by `revalidatePath(path, "page")` iterating a per-feature `<DOMAIN>_ROUTER_PATHS` array (e.g. `ATTENDANCE_ROUTER_PATHS` in `src/features/attendance/cache-tags.ts`). The Data-Cache tag taxonomy below (`<domain>:<entity>`, `<domain>:<entity>:<id>`) is RESERVED for future `unstable_cache`-wrapped org-wide reads (POS catalog, role directory, location list) that do NOT depend on per-user RLS. `revalidatePath("/", "layout")` is FORBIDDEN in app code. `revalidateTag` / `updateTag` may only be called when the same PR introduces the paired `unstable_cache`-wrapped read; otherwise they are no-ops and pollute the mental model.
>
>   The tag convention below remains canonical for when tags DO get used — `<domain>:<entity>` for collections, `<domain>:<entity>:<id>` for single items, `<domain>:<entity>:<userId>[:<scope>]` for per-user scoped caches (avoids thundering-herd invalidation at scale). Tag-builder helpers colocate with the per-feature `cache-tags.ts` file.
>   Canonical tag taxonomy:
>   - **iam:** `iam:requests`, `iam:requests:<id>`
>   - **hr:** `hr:staff`, `hr:staff:<id>`, `hr:shifts`, `hr:roster-templates`, `hr:leaves`, `hr:leaves:<id>`, `hr:leave-policies`, `hr:attendance`, `hr:exceptions`, `hr:staffing`
>   - **pos:** `pos:points`, `pos:points:<id>`, `pos:catalog:<pos_point_id>`, `pos:modifiers`, `pos:orders`, `pos:orders:<id>`, `pos:bom`, `pos:bom:<id>`, `pos:price-lists`, `pos:price-lists:<id>`
>   - **procurement:** `procurement:materials`, `procurement:materials:<id>`, `procurement:suppliers`, `procurement:suppliers:<id>`, `procurement:purchase-orders`, `procurement:purchase-orders:<id>`, `procurement:reorder`
>   - **inventory:** `inventory:stock`, `inventory:categories`, `inventory:uom`, `inventory:requisitions`, `inventory:requisitions:<id>`, `inventory:reconciliations`, `inventory:reconciliations:<id>`, `inventory:write-offs`, `inventory:equipment`, `inventory:movements`, `inventory:valuation`
>   - **ops:** `ops:incidents`, `ops:incidents:<id>`, `ops:telemetry`, `ops:vehicles`
>   - **booking:** `booking:experiences`, `booking:experiences:<id>`, `booking:tiers`, `booking:scheduler-config`, `booking:slots`, `booking:bookings`, `booking:bookings:<id>`
>   - **marketing:** `marketing:campaigns`, `marketing:campaigns:<id>`, `marketing:promos`, `marketing:surveys`
>   - **maintenance:** `maintenance:orders`, `maintenance:orders:<id>`, `maintenance:vendors`, `maintenance:device-topology`
>   - **comms:** `comms:announcements`, `comms:announcements:<id>`, `comms:reads:<user_id>`
>   - **reports/audit:** `reports:executions`, `reports:scheduled`, `audit:log`
>   - **system:** `system:devices`, `system:devices:<id>`, `system:zones`, `system:locations`, `system:org-units`, `system:permissions`, `system:roles`, `system:units`, `system:heartbeats`
>     Routes MUST tag with the `:<id>` variant when mutating a single row so that sibling queries remain cached.
>
> - **Accessibility (WCAG 2.2 Level AA — non-negotiable):** Every page MUST pass `@axe-core/playwright` with zero `serious` or `critical` violations and score ≥ 95 in `lighthouse-ci` a11y (CI-gated). Every interactive element reachable via keyboard with visible `:focus-visible` ring. Dialogs and Sheets trap focus on open and restore to trigger on close (`focus-trap-react` or equivalent). Semantic HTML first; ARIA only when native semantics are insufficient. Forms use explicit `<label for="...">` (placeholder-as-label FORBIDDEN); field errors announced via `aria-describedby` + `role="alert"`; invalid inputs carry `aria-invalid="true"`. Color contrast ≥ 4.5:1 body, ≥ 3:1 large text and UI components. Respect `prefers-reduced-motion: reduce` — non-essential animations suppressed. Every `<img>` has `alt` (decorative → `alt=""`). Camera/selfie capture UIs announce state changes via `aria-live="polite"`. `sonner` toasts carry `role="status"` (info/success) or `role="alert"` (error). Skip-to-content link required at the top of every portal layout.
> - **Internationalization (`next-intl`):** Routes MUST be locale-segmented at the top of the tree: `/[locale]/(admin|management|crew|auth|guest)/...`. Default locale `en`; required locales `en`, `ms` (Bahasa Malaysia). Locale resolution order (middleware): explicit URL segment → `NEXT_LOCALE` cookie → `Accept-Language` → default. Bare paths (`/admin`) are middleware-rewritten to the default-locale form (`/en/admin`) so bookmarks stay valid. Every user-visible string MUST live in `messages/<locale>.json` and be consumed via `useTranslations()` (client) or `getTranslations()` (server). Hardcoded user-visible strings are FORBIDDEN; `eslint-plugin-i18next` enforces detection. Numbers, currency, dates formatted via `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`; currency default MYR, per-tenant overridable. Pluralization and gender via ICU MessageFormat — string concatenation FORBIDDEN. All styling uses logical CSS properties (`margin-inline`, `padding-block`, `text-start`) for RTL-readiness.

> - **Observability stack:** Client and server MUST initialize the following at app boot:
>   1. **Sentry** — error capture + Session Replay (prod sampling 10% / 100% on error); PII redaction per data-classification rules (CLAUDE.md §2). Source maps uploaded per build; release health enabled.
>   2. **OpenTelemetry** — instruments every Server Action and RPC. Span naming: `action.<domain>.<name>`, `rpc.<name>`. Trace context propagated via `traceparent` into Edge Functions and external HTTP calls.
>   3. **PostHog** (or equivalent product analytics) — explicit `capture(event, props)` at business-meaningful events: booking_created, pos_order_submitted, clock_in, clock_out, incident_reported, leave_requested, wo_completed, promo_redeemed. `identify()` on login uses hashed user_id. Raw PII is never captured.
>   4. **Web Vitals** — `@vercel/speed-insights` plus `web-vitals` library streaming to PostHog for per-route RUM (LCP, CLS, INP).
>   5. Every Server Action emits `logger.info({ event, duration_ms, request_id, user_id })` on success and `logger.error({ event, error_code, request_id, user_id })` on failure.
>   6. Fatal client errors render the route-level `error.tsx` boundary AND report to Sentry before the user sees a retry.
> - **Server Action rate limiting:** Every Server Action MUST call `rateLimit({ bucket, key })` from `src/lib/rate-limit.ts` (Upstash Redis token-bucket) as step 3 of the Server Action pipeline (CLAUDE.md §4). Bucket defaults (override only with ADR):
>   - Login / OTP dispatch: 5/min/IP, 10/min/email.
>   - Guest booking creation (`rpc_create_booking`): 10/hour/IP, 3/min/IP.
>   - Guest OTP verification (`rpc_verify_otp`): 5 attempts per 15 min per session.
>   - Clock-in / clock-out (`rpc_clock_in`, `rpc_clock_out`): 20/min/user.
>   - POS order submission (`submit_pos_order`): 60/min/user.
>   - File upload initiation: 30/min/user.
>   - Anonymous survey submit: 10/hour/IP; CAPTCHA challenge after 3.
>   - Any other mutation: 100/min/user.
>     On exceed → Server Action returns `{ success: false, error: 'RATE_LIMITED', retry_after_seconds }`. Client surfaces a toast and disables the trigger with a countdown. Vercel Edge Middleware applies a coarser IP-level rate limit in front of all of the above.
> - **Image optimization & upload delivery:** Every display of a user-supplied image (avatars, selfies, incident attachments, write-off photos, captured photos, maintenance photos) MUST use `next/image` with a remote-pattern allowlist scoped to the Supabase Storage hostname. Upload pipeline:
>   1. Server Action returns a short-lived signed upload URL (TTL ≤ 15 min) bound to caller identity.
>   2. Client uploads the original to `<bucket>/<owner_id>/<resource_id>/<uuid>.original.<ext>`.
>   3. Storage object-created webhook triggers `cron-image-pipeline` (Edge Function) which: validates MIME signature, strips EXIF, invokes Supabase Storage Transform API to emit AVIF + WebP derivatives at widths 320, 768, 1280, stores them alongside the original.
>   4. Display components serve derivatives via `next/image`'s `sizes` prop — always AVIF first with WebP fallback.
>   5. Originals remain RLS-protected; derivatives inherit the same Storage bucket policy.
>   6. Below-fold images carry `loading="lazy"`. AVIF/WebP derivatives served with `Cache-Control: public, max-age=31536000, immutable` via Vercel Edge; originals with `stale-while-revalidate`.
>      Raw `<img>` tags, unsigned URLs, and public buckets are FORBIDDEN for user-supplied content.

---

## 1. Auth Routes (`/auth/*`)

No domain gating — these routes are accessible to unauthenticated or partially-authenticated users.

| Route                  | Page Title             | Auth Method                                       | Data Tables / RPCs         | WF Ref |
| ---------------------- | ---------------------- | ------------------------------------------------- | -------------------------- | ------ |
| `/auth/login`          | Staff Login            | Supabase Auth (email + password)                  | `auth.users`               | WF-0   |
| `/auth/set-password`   | Set Password           | Authenticated (password_set = false)              | `rpc_confirm_password_set` | WF-0   |
| `/auth/not-started`    | Employment Not Started | Static (middleware redirect)                      | —                          | WF-0   |
| `/auth/access-revoked` | Access Revoked         | Static (middleware redirect)                      | —                          | WF-0   |
| `/auth/on-leave`       | On Leave Notice        | Static (middleware redirect, sets read-only flag) | —                          | WF-0   |

### `/auth/login`

WHO: Unauthenticated users
PURPOSE: Staff authenticates with email + password to receive a JWT and enter the correct portal
WORKFLOW: WF-0

LAYOUT:

- Centered card (auth shell), no navigation
- Email + password fields, submit button
- Error message area for invalid credentials or locked accounts

COMPONENTS:

- `LoginForm` — email input, password input, submit button

DATA LOADING:

- None — Supabase Auth handles credential validation directly
- On success: JWT issued with `app_metadata` containing `access_level`, `staff_role`, `org_unit_path`, `domains`, `last_permission_update`
- Middleware reads `access_level` from JWT and redirects: `admin` → `/admin`, `manager` → `/management`, `crew` → `/crew/attendance`

INTERACTIONS:

- Submit: `supabase.auth.signInWithPassword({ email, password })` → on success redirect to portal → on failure show error
- Locked accounts (`auth.users.banned_until` set for suspended/terminated staff): Supabase Auth rejects at login layer → show "Account locked" message

DOMAIN GATING:

- None — pre-authentication route

TABLES TOUCHED:

- SELECT: `auth.users`

### `/auth/set-password`

WHO: Users authenticated via invite link token (`password_set = false` — no credentials exist yet)
PURPOSE: Mandatory first-login password change before accessing any staff portal route
WORKFLOW: WF-0

LAYOUT:

- Centered card (auth shell)
- New password + confirm password fields

COMPONENTS:

- `SetPasswordForm` — new password, confirm password, submit

DATA LOADING:

- None — user session established by invite token (via `auth.admin.generateLink(type: invite)`), middleware forces this route when `password_set = false`

INTERACTIONS:

- Submit: new password fields → Supabase `auth.updateUser({ password })` + Server Action → `rpc_confirm_password_set()` → sets `profiles.password_set = TRUE` → redirect to portal based on `access_level`

DOMAIN GATING:

- None — all invite-authenticated users with `password_set = false` are forced here

TABLES TOUCHED:

- UPDATE: `profiles` (via `rpc_confirm_password_set`)
- RPCs: `rpc_confirm_password_set()`

### `/auth/not-started`

Static page. Displayed when middleware detects `employment_status = 'pending'` and `contract_start > today`. No data loading, no mutations. Middleware redirects here when the staff member's employment has not begun. `cron-employment-sync` auto-activates the account on `contract_start`.

### `/auth/access-revoked`

Static page. Displayed when middleware detects `employment_status IN ('suspended', 'terminated')`. No data loading, no mutations. Middleware redirects here when the staff account is locked.

### `/auth/on-leave`

Static page. Displayed when middleware detects `employment_status = 'on_leave'`. No data loading, no mutations. Middleware sets `x-agartha-readonly: true` response header. User proceeds to their portal in view-only mode — all mutation controls disabled, Server Actions reject with `FORBIDDEN_ON_LEAVE`.

---

## 2. Admin Portal (`/admin/*`)

Admin portal serves TWO distinct admin roles via **domain presence checks** (not role string):

- **IT Admin** — routes gated by `it:c` or `system:c`
- **Business Admin** — routes gated by `booking:r` + `reports:r` (without `it:c`)
- **Shared** — routes visible to both (gated by `reports:r` or `comms:r`)

### 2a. IT Admin Routes

| Route                  | Page Title            | Domain   | minAccess | Data Tables / RPCs                                                   | WF Ref           |
| ---------------------- | --------------------- | -------- | --------- | -------------------------------------------------------------------- | ---------------- |
| `/admin/it`            | System Dashboard      | `it`     | `c`       | `devices`, `device_heartbeats`, `maintenance_orders`, `iam_requests` | —                |
| `/admin/iam`           | IAM Ledger            | `hr`     | `c`       | `profiles`, `staff_records`, `iam_requests`, `roles`, `org_units`    | WF-1, WF-2, WF-3 |
| `/admin/iam/[id]`      | IAM Request Detail    | `hr`     | `u`       | `iam_requests`, `profiles`, `staff_records`                          | WF-1, WF-2, WF-3 |
| `/admin/devices`       | Device Registry       | `it`     | `c`       | `devices`, `device_types`, `device_heartbeats`, `vlans`              | —                |
| `/admin/devices/[id]`  | Device Detail         | `it`     | `c`       | `devices`, `device_heartbeats`, `vlans`, `maintenance_orders`        | WF-15            |
| `/admin/zones`         | Zones & Locations     | `system` | `c`       | `zones`, `locations`, `org_units`                                    | —                |
| `/admin/org-units`     | Org Unit Hierarchy    | `system` | `c`       | `org_units` (ltree hierarchy)                                        | WF-19            |
| `/admin/permissions`   | Permission Management | `system` | `c`       | `roles`, `permission_domains`, `role_domain_permissions`             | WF-19            |
| `/admin/system-health` | System Health         | `it`     | `c`       | `device_heartbeats`, `zone_telemetry`, `devices`                     | —                |
| `/admin/units`         | Units of Measure      | `system` | `c`       | `units`                                                              | —                |

### `/admin/it` (System Dashboard)

WHO: `it` domain with `c` access
PURPOSE: Single-pane-of-glass for IT operations — infrastructure health, active incidents, and pending actions
WORKFLOW: —
NOTE: Reached via an edge-level redirect from `/admin` (see "/admin redirect" spec below). This URL is also directly deep-linkable.

LAYOUT:

- **KPI row** (4 cards, each links to its detail route):
  - Fleet health: `{online}/{total} devices online` → `/admin/devices`
  - Heartbeat alerts: `{count} offline/degraded` → `/admin/system-health`
  - Active maintenance: `{count} WOs in progress` → link to maintenance if accessible
  - Pending IAM: `{count} awaiting IT` → `/admin/iam`
- **Alert feed** — last 24h, reverse-chronological, mixed event types:
  - Heartbeat status changes: `device_heartbeats` WHERE status IN ('offline', 'degraded') AND recorded_at > NOW() - INTERVAL '24 hours', joined to `devices` (name, device_type)
  - Active maintenance windows: `maintenance_orders` WHERE status = 'active', joined to `devices` (target_ci name), `maintenance_vendors` (name). Shows time remaining until maintenance_end
- **Device status breakdown** — donut/bar chart: `devices` grouped by `status` (online | offline | maintenance | decommissioned), clickable segments → filtered `/admin/devices` view
- **Avg response time** — sparkline of `device_heartbeats.response_time_ms` trend over last 24h (facility-wide median)

COMPONENTS:

- `KPICardRow` — 4 summary cards with counts and trend arrows
- `AlertFeed` — mixed-type chronological alert list
- `DeviceStatusChart` — donut or horizontal bar by status
- `ResponseTimeSpark` — 24h response time sparkline

DATA LOADING:

- RSC fetches:
  - `devices` (COUNT grouped by status)
  - `device_heartbeats` WHERE recorded_at > NOW() - '24h' (latest per device via DISTINCT ON, plus time-series for sparkline)
  - `maintenance_orders` WHERE status = 'active' JOIN `devices` JOIN `maintenance_vendors`
  - `iam_requests` (COUNT WHERE status = 'pending_it')
- Passed to client via dehydrated React Query

INTERACTIONS:

- No mutations — read-only dashboard
- KPI cards link to their respective detail routes
- Alert feed rows link to `/admin/devices/[id]` or maintenance order detail
- Chart segments link to pre-filtered `/admin/devices?status={segment}`

DOMAIN GATING:

- Requires `it:c`. Missing domain → middleware Gate 5 redirects to `/admin/business` if the caller holds Executive-Dashboard entitlements, otherwise `/auth/access-revoked`.

TABLES TOUCHED:

- SELECT: `devices`, `device_heartbeats`, `maintenance_orders`, `maintenance_vendors`, `iam_requests`

### `/admin/iam`

WHO: `hr` domain with `c` access
PURPOSE: IT admin reviews and processes IAM provisioning, transfer, termination, and reactivation requests
WORKFLOW: WF-1, WF-2, WF-3

LAYOUT:

- KPI row: "Pending: {count}" | "Approved today: {count}" | "Avg wait: {duration}"
- Status tabs with counts (nuqs `?status=pending_it`): Pending ({n}) | Approved | Rejected
- Within each tab: filters by request_type and staff name search
- Default sort: created_at ASC (oldest pending first — FIFO work queue)
- Columns: type (badge), staff name, target role, current role, HR notes, waiting since, submitted
- Empty state: "No pending access requests"

COMPONENTS:

- `IAMRequestTable` — filterable data table
- `IAMRequestRow` — displays request_type badge, staff legal_name, target_role, current_role, hr_remark, status, created_at

DATA LOADING:

- RSC fetches: `iam_requests` JOIN `staff_records` (legal_name) JOIN `roles` AS target (display_name) JOIN `roles` AS current (display_name)
- Dehydrated React Query, filters via nuqs URL params (`?status=pending_it`)

INTERACTIONS:

- Approve: click → Server Action → UPDATE `iam_requests` SET status = 'approved', approved_by = auth.uid(), approved_at = NOW() → then per type: provisioning creates auth.users + sends invite; transfer updates `profiles.role_id`; termination/suspension calls `admin_lock_account` → `revalidatePath`
- Reject: click → modal for `it_remark` → Server Action → UPDATE `iam_requests` SET status = 'rejected', it_remark, approved_by = auth.uid() → `revalidatePath`
- For provisioning: business email auto-generated (first.last@domain.com), IT can override before approval

DOMAIN GATING:

- List visible with `hr:r`; approve/reject actions require `hr:u`

TABLES TOUCHED:

- SELECT: `iam_requests`, `staff_records`, `roles`, `profiles`
- UPDATE: `iam_requests` (status, approved_by, approved_at, it_remark, invite_sent_at)
- INSERT: `auth.users` (on provisioning approval via Server Action)
- RPCs: `admin_lock_account(p_target_user_id, p_lock, p_reason)` (on termination/suspension)

### `/admin/iam/[id]`

WHO: `hr` domain with `u` access
PURPOSE: Detailed view of a single IAM request with linked staff profile and records
WORKFLOW: WF-1, WF-2, WF-3

LAYOUT:

- Dedicated detail page (full viewport) — reached via row click from `/admin/iam` or direct deep-link
- Header: type (badge), status (badge), waiting since, requested by
- Staff details card: legal_name, personal_email, org_unit, contract_start, contract_end
- Request-specific section: provisioning (generated business email — editable, target role), transfer (current_role → target_role, hr_remark), termination/suspension (reason, hr_remark)
- Action buttons: Approve / Reject (visible only when status = `pending_it`). Approve uses inline confirmation strip; Reject opens a centered confirmation dialog for `it_remark` capture.

COMPONENTS:

- `IAMRequestDetail` — full request display with staff context
- `ApproveRejectActions` — action buttons with inline/dialog confirmation (no nested overlays)

DATA LOADING:

- RSC fetches: `iam_requests` WHERE id = param JOIN `staff_records` JOIN `profiles` JOIN `roles` (both current and target)
- Direct props to client component

INTERACTIONS:

- Same approve/reject flow as `/admin/iam` list actions
- For provisioning: editable business email override field before approval

DOMAIN GATING:

- View requires `hr:r`; actions require `hr:u`

TABLES TOUCHED:

- SELECT: `iam_requests`, `staff_records`, `profiles`, `roles`
- UPDATE: `iam_requests`

### `/admin/devices`

WHO: `it` domain with `c` access
PURPOSE: Registry of all physical devices with status monitoring
WORKFLOW: —

LAYOUT:

- KPI row: "Stale heartbeat (>1h): {n}" | "Warranty expiring ≤30d: {n}" | "Under active WO: {n}" | "Avg response time: {ms}"
- Status tabs with counts (nuqs `?status=all`): All ({n}) | Online ({n}) | Offline ({n}) | Maintenance ({n}) | Decommissioned ({n})
- Within each tab: filters by device_type, location, search (nuqs `?q=`: searches name, serial_number, asset_tag, ip_address)
- Columns: name, device_type, status badge, zone/location, last heartbeat (humanized from latest `device_heartbeats.recorded_at`), warranty_expiry (date or "Expired" badge), serial_number
- Empty state: "No devices registered. [Register Device]" (CTA opens create form, visible when user has `it:c`)
- "Device Types" management panel (collapsible): CRUD `device_types` (name, display_name). Gated by `it:c`/`it:u`

COMPONENTS:

- `DeviceTable` — sortable, filterable data table
- `DeviceCreateForm` — Sheet/modal for creating new device

DATA LOADING:

- RSC fetches: `devices` JOIN `device_types` (display_name) LEFT JOIN `zones` (name, location_id) LEFT JOIN `vlans` (vlan_id, name), latest `device_heartbeats` per device (DISTINCT ON device_id ORDER BY recorded_at DESC)
- Dehydrated React Query

INTERACTIONS:

- Create: form → Server Action → INSERT `devices` (name, device_type_id, serial_number, asset_tag, zone_id, ip_address, mac_address, vlan_id, parent_device_id, manufacturer, model, firmware_version, commission_date, warranty_expiry, maintenance_vendor_id) → `revalidatePath`
- Edit: inline or modal → Server Action → UPDATE `devices` → `revalidatePath`
- Click row → navigate to `/admin/devices/[id]`

DOMAIN GATING:

- List requires `it:r`; create/edit requires `it:c`/`it:u`

TABLES TOUCHED:

- SELECT: `devices`, `device_types`, `zones`, `vlans`, `device_heartbeats`
- INSERT: `devices`, `device_types`
- UPDATE: `devices`, `device_types`

### `/admin/devices/[id]`

WHO: `it` domain with `c` access
PURPOSE: Detailed device view with heartbeat history and linked maintenance orders
WORKFLOW: WF-15

LAYOUT:

- Header: device name, type badge, status badge
- Info section: serial_number, asset_tag, ip_address, mac_address, firmware_version, manufacturer, model, commission_date, warranty_expiry, zone, VLAN
- Heartbeat timeline: recent `device_heartbeats` for this device
- Maintenance history: `maintenance_orders` WHERE target_ci_id = this device

COMPONENTS:

- `DeviceInfoCard` — device metadata
- `HeartbeatTimeline` — chart/list of heartbeats
- `MaintenanceOrderList` — linked work orders

DATA LOADING:

- RSC fetches: `devices` WHERE id = param JOIN `device_types` JOIN `zones` JOIN `vlans`, `device_heartbeats` WHERE device_id ORDER BY recorded_at DESC, `maintenance_orders` WHERE target_ci_id = device.id
- Dehydrated React Query

INTERACTIONS:

- Edit device fields → Server Action → UPDATE `devices` → `revalidatePath`
- "Create Work Order" → navigate to `/management/maintenance/orders` with target_ci_id pre-filled

DOMAIN GATING:

- View requires `it:r`; edit requires `it:u`

TABLES TOUCHED:

- SELECT: `devices`, `device_types`, `device_heartbeats`, `vlans`, `zones`, `maintenance_orders`
- UPDATE: `devices`

### `/admin/zones`

WHO: `system` domain with `c` access
PURPOSE: Manage physical locations, nested zones, and control which material categories each location can stock
WORKFLOW: —

LAYOUT:

- Tabbed layout (nuqs `?tab=locations|zones|categories`)
- **Locations tab:** data table of `locations`. Fields: name (unique), org_unit_id (dropdown from `org_units`), is_active toggle
- **Zones tab:** data table of `zones` grouped by location. Fields: name (unique), description, capacity (integer > 0), location_id (FK to `locations`), is_active
- **Allowed Categories tab:** junction manager for `location_allowed_categories` — multi-select `material_categories` per location

COMPONENTS:

- `LocationTable` — CRUD data table for locations
- `ZoneTable` — CRUD data table for zones, nested under location groups
- `LocationCategoryAssignment` — junction manager linking categories to locations

DATA LOADING:

- RSC fetches: `locations` LEFT JOIN `org_units`, `zones` JOIN `locations`, `location_allowed_categories` JOIN `material_categories` JOIN `locations`
- Dehydrated React Query

INTERACTIONS:

- Create/Edit location: form → Server Action → INSERT/UPDATE `locations` (name, org_unit_id, is_active) → `revalidatePath`. **Critical:** org_unit_id links location to org hierarchy, enabling auto-resolution chain `staff_records.org_unit_id → org_units → locations.org_unit_id → pos_points.location_id`
- Create/Edit zone: form → Server Action → INSERT/UPDATE `zones` (name, description, capacity, location_id, is_active) → `revalidatePath`
- Assign categories: multi-select → Server Action → INSERT/DELETE `location_allowed_categories` (location_id, category_id) → `revalidatePath`

DOMAIN GATING:

- All CRUD requires `system:c`/`system:u`/`system:d`

TABLES TOUCHED:

- SELECT: `locations`, `org_units`, `zones`, `location_allowed_categories`, `material_categories`
- INSERT: `locations`, `zones`, `location_allowed_categories`
- UPDATE: `locations`, `zones`
- DELETE: `location_allowed_categories`

### `/admin/org-units`

WHO: `system` domain with `c` access
PURPOSE: Manage the organizational hierarchy tree used for data scoping (ltree-based RLS)
WORKFLOW: WF-19

LAYOUT:

- Tree view of `org_units` using ltree `path` column
- Each node shows: code, name, unit_type, is_active, staff count
- CRUD form as side panel

COMPONENTS:

- `OrgUnitTree` — interactive tree visualization with expand/collapse
- `OrgUnitForm` — create/edit form

DATA LOADING:

- RSC fetches: `org_units` ORDER BY path
- Dehydrated React Query

INTERACTIONS:

- Create: form → Server Action → INSERT `org_units` (code, name, unit_type, parent_id, is_active, path) → `revalidatePath`
- Edit: form → Server Action → UPDATE `org_units` → `revalidatePath`
- Drag-and-drop reparenting: updates `path` (ltree) + cascades to all descendant paths + denormalized `org_unit_path` on 8 downstream tables (`staff_records`, `leave_requests`, `shift_schedules`, `timecard_punches`, `attendance_exceptions`, `leave_ledger`, `crew_zones`, `staff_roster_assignments`)
- Type dropdown values: Company | Division | Department

DOMAIN GATING:

- All CRUD requires `system:c`/`system:u`/`system:d`

TABLES TOUCHED:

- SELECT: `org_units`
- INSERT: `org_units`
- UPDATE: `org_units`

### `/admin/permissions`

WHO: `system` domain with `c` access
PURPOSE: Manage the role-domain permission matrix that controls all RBAC across the system
WORKFLOW: WF-19

LAYOUT:

- Tabbed layout (nuqs `?tab=roles|domains|matrix`)
- **Tab 1: Roles** — data table of all 19 `roles`. Display: name, display_name, access_level (`admin` | `manager` | `crew`)
- **Tab 2: Permission Domains** — read-only reference of 13 `permission_domains`. Display: code, name, description
- **Tab 3: Role Permissions** — role-centric editor. Select a role from sidebar list → show that role's 13 domain rows with CRUD checkboxes (Create, Read, Update, Delete). "Compare Roles" mode for side-by-side view of 2-3 roles. Full 19×13 matrix available as a read-only reference export.

COMPONENTS:

- `RolesTable` — CRUD data table for roles
- `PermissionDomainsTable` — read-only reference table
- `PermissionMatrix` — editable checkbox grid

DATA LOADING:

- RSC fetches: `roles`, `permission_domains`, `role_domain_permissions`
- Dehydrated React Query

INTERACTIONS:

- Edit matrix cell: toggle checkbox → Server Action → INSERT/UPDATE `role_domain_permissions` (role_id, domain_id, can_create, can_read, can_update, can_delete) → trigger `trg_role_domain_permissions_changed` fires (resolves full domains JSONB, injects into `auth.users.raw_app_meta_data`, stamps `profiles.last_permission_update`, invalidates stale JWTs via `is_claims_fresh()`) → `revalidatePath`
- CRUD roles: form → Server Action → INSERT/UPDATE/DELETE `roles` → `revalidatePath`

DOMAIN GATING:

- View requires `system:r`; edit requires `system:c`/`system:u`/`system:d`

TABLES TOUCHED:

- SELECT: `roles`, `permission_domains`, `role_domain_permissions`
- INSERT: `role_domain_permissions`, `roles`
- UPDATE: `role_domain_permissions`, `roles`
- DELETE: `role_domain_permissions`, `roles`

### `/admin/system-health`

WHO: `it` domain with `c` access
PURPOSE: Real-time system health monitoring — device heartbeats and zone telemetry aggregates
WORKFLOW: —

LAYOUT:

- KPI cards: total devices online/offline/degraded, telemetry coverage
- Device heartbeat grid: recent `device_heartbeats` per device with status badges (online | offline | degraded)
- Zone telemetry summary: `zone_telemetry` latest readings per zone (current_occupancy, temperature, humidity, co2_level)

COMPONENTS:

- `SystemHealthKPIs` — aggregate status counts
- `HeartbeatGrid` — device-by-device heartbeat status
- `ZoneTelemetrySummary` — latest telemetry per zone

DATA LOADING:

- RSC fetches: `device_heartbeats` (latest per device via DISTINCT ON), `devices`, `zone_telemetry` (latest per zone), `zones`
- Dehydrated React Query
- Heartbeat data flow: devices push heartbeat status to `device_heartbeats` via IoT agent or polling Edge Function. `heartbeat_status` ENUM values: `online` (responding normally), `offline` (no response), `degraded` (responding but slow — `response_time_ms` above threshold). Collection interval and degraded threshold are deployment-specific configuration.

INTERACTIONS:

- No mutations — read-only monitoring page
- Click device → navigate to `/admin/devices/[id]`

DOMAIN GATING:

- Requires `it:r`

TABLES TOUCHED:

- SELECT: `device_heartbeats`, `devices`, `zone_telemetry`, `zones`

### `/admin/units`

WHO: `system` domain with `c` access
PURPOSE: Manage units of measure referenced across materials, procurement, and inventory
WORKFLOW: —

LAYOUT:

- Simple data table of `units`
- Columns: name, abbreviation
- Empty state: "No units of measure defined. [Add Unit]" (CTA opens create form, visible when user has `system:c`)

COMPONENTS:

- `UnitsTable` — CRUD data table

DATA LOADING:

- RSC fetches: `units` ORDER BY name
- Direct props

INTERACTIONS:

- Create: form → Server Action → INSERT `units` (name, abbreviation) → `revalidatePath`
- Edit: inline → Server Action → UPDATE `units` → `revalidatePath`

DOMAIN GATING:

- Read: universal (all authenticated users via Tier 1 RLS)
- Create/Edit/Delete: requires `system:c`/`system:u`/`system:d`

TABLES TOUCHED:

- SELECT: `units`
- INSERT: `units`
- UPDATE: `units`

### 2b. Business Admin Routes

| Route               | Page Title          | Domain      | minAccess | Data Tables / RPCs                                                                                                     | WF Ref |
| ------------------- | ------------------- | ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| `/admin/business`   | Executive Dashboard | `booking`   | `r`       | `bookings`, `booking_payments`, `orders`, `survey_responses`, `incidents`                                              | —      |
| `/admin/revenue`    | Revenue & Sales     | `booking`   | `r`       | `bookings`, `booking_payments`, `orders`, `order_items`, `pos_points`, `experiences`, `tiers`                          | —      |
| `/admin/operations` | Operations Overview | `ops`       | `r`       | `zone_telemetry`, `zones`, `incidents`, `maintenance_orders`, `time_slots`, `experiences`                              | —      |
| `/admin/costs`      | Cost & Waste        | `inventory` | `r`       | `stock_balance_cache`, `material_valuation`, `write_offs`, `goods_movements`, `goods_movement_items`, `movement_types` | —      |
| `/admin/guests`     | Guest Satisfaction  | `reports`   | `r`       | `survey_responses`, `bookings`, `experiences`                                                                          | —      |
| `/admin/workforce`  | Workforce Overview  | `hr`        | `r`       | `profiles`, `staff_records`, `v_shift_attendance`, `v_leave_balances`, `attendance_exceptions`, `roles`, `org_units`   | —      |

**`/admin` redirect (middleware-only — no `page.tsx`):**

- `/admin` is an edge-level redirect handled by `middleware.ts`. It renders nothing.
- Has `it:c` → 307 redirect to `/admin/it` (IT takes priority when both apply).
- Has `booking:r` + `reports:r` (without `it:c`) → 307 redirect to `/admin/business`.
- Has neither → 307 redirect to `/auth/access-revoked`.
- Rationale: a conditional render inside one `page.tsx` ships both dashboards' JS bundles to every admin and forces a runtime branch per request. Splitting to two concrete routes with an edge redirect eliminates bundle bloat, removes RSC branching, and lets each admin load only the dashboard they are entitled to.

### `/admin/business` (Executive Dashboard)

WHO: `booking` domain with `r` access (without `it:c`)
PURPOSE: Morning briefing for facility owners — cross-domain health snapshot answering "how is the business doing right now"
WORKFLOW: —
NOTE: Reached via edge-level redirect from `/admin`. Deep-linkable.

LAYOUT:

- Date range selector (nuqs `?range=today|7d|30d|custom`, default: today) with period comparison toggle (`?compare=true` → vs. prior equivalent period)
- **Revenue strip** (3 cards): total revenue (booking payments + POS orders combined, with delta), booking revenue (from `booking_payments` WHERE status = 'success'), POS revenue (from `orders` WHERE status = 'completed' SUM total_amount). Each card links to `/admin/revenue`
- **Operations strip** (3 cards): facility occupancy now (SUM `zone_telemetry.current_occupancy` / SUM `zones.capacity`, live), open incidents ({n}, links to `/admin/operations`), active maintenance WOs blocking zones ({n})
- **Guest strip** (2 cards): NPS score (from `survey_responses.nps_score` — promoters 9-10 minus detractors 0-6, as percentage), avg visit rating (from `survey_responses.overall_score`). Links to `/admin/guests`
- **Workforce strip** (2 cards): attendance rate today (present / scheduled from `v_shift_attendance`), unjustified exceptions this week (from `attendance_exceptions`). Links to `/admin/workforce`
- **Trend chart**: combined revenue (POS + bookings) over selected period, line chart with prior period overlay when comparison enabled

COMPONENTS:

- `PeriodSelector` — date range + comparison toggle
- `RevenueStrip` — 3 revenue KPI cards
- `OpsStrip` — 3 operational health cards
- `GuestStrip` — 2 guest satisfaction cards
- `WorkforceStrip` — 2 workforce cards
- `RevenueTrendChart` — combined revenue line chart with period overlay

DATA LOADING:

- RSC fetches:
  - `booking_payments` (SUM amount WHERE status = 'success', grouped by period)
  - `orders` (SUM total_amount WHERE status = 'completed', grouped by period)
  - `zone_telemetry` (latest per zone for live occupancy)
  - `zones` (capacity for occupancy denominator)
  - `incidents` (COUNT WHERE status = 'open')
  - `maintenance_orders` (COUNT WHERE status = 'active')
  - `survey_responses` (AVG overall_score, NPS calculation from nps_score)
  - `v_shift_attendance` (COUNT by derived_status for today)
  - `attendance_exceptions` (COUNT WHERE status = 'unjustified' this week)
- Dehydrated React Query

INTERACTIONS:

- No mutations — read-only dashboard
- Period selector updates all cards and chart via nuqs → React Query refetch
- Each strip card links to its detail insight page

DOMAIN GATING:

- Requires `booking:r` + `reports:r`

TABLES TOUCHED:

- SELECT: `bookings`, `booking_payments`, `orders`, `zone_telemetry`, `zones`, `incidents`, `maintenance_orders`, `survey_responses`, `v_shift_attendance`, `attendance_exceptions`

### `/admin/revenue`

WHO: `booking` domain with `r` access
PURPOSE: Revenue deep-dive — where money comes from, which products and experiences perform, payment mix
WORKFLOW: —

LAYOUT:

- Date range selector (nuqs `?range=today|7d|30d|custom`) with comparison toggle
- **Top-line KPIs** (5 cards): total combined revenue (POS + bookings, with delta), POS revenue, booking revenue, avg POS ticket (SUM total_amount / COUNT orders), avg booking value (SUM total_price / COUNT bookings)
- **Revenue by source** — two-column layout:
  - Left: **POS breakdown** — revenue by POS point (horizontal bar from `orders` JOIN `pos_points`), top 10 selling items by revenue (from `order_items` JOIN `materials`), payment method distribution (donut from `orders.payment_method`: cash | card | face_pay | digital_wallet)
  - Right: **Booking breakdown** — revenue by tier (horizontal bar from `bookings` JOIN `tiers`), revenue by experience (from `bookings` JOIN `experiences`), booking payment method distribution (donut from `booking_payments.method`)
- **Revenue trend**: daily revenue line chart (POS and bookings as separate series), selectable granularity (day/week/month via nuqs `?granularity=day`)
- **Slot utilization**: bookings vs capacity over time (from `time_slots.booked_count` vs `COALESCE(override_capacity, capacity_per_slot)`)

COMPONENTS:

- `RevenueKPIs` — 5 top-line cards
- `POSBreakdown` — POS point revenue bars, top items, payment donut
- `BookingBreakdown` — tier revenue bars, experience revenue, payment donut
- `RevenueTrend` — multi-series line chart with granularity toggle
- `SlotUtilization` — capacity vs bookings time chart

DATA LOADING:

- RSC fetches:
  - `orders` JOIN `pos_points` (revenue by point, payment method distribution)
  - `order_items` JOIN `materials` (top items by revenue)
  - `bookings` JOIN `tiers` JOIN `experiences` (revenue by tier, by experience)
  - `booking_payments` (booking payment method distribution, revenue aggregates)
  - `time_slots` JOIN `experiences` (slot utilization)
- Dehydrated React Query

INTERACTIONS:

- No mutations — read-only analytics
- Period selector and granularity toggle via nuqs → React Query refetch

DOMAIN GATING:

- Requires `booking:r`

TABLES TOUCHED:

- SELECT: `orders`, `order_items`, `pos_points`, `materials`, `bookings`, `booking_payments`, `tiers`, `experiences`, `time_slots`

### `/admin/operations`

WHO: `ops` domain with `r` access
PURPOSE: Facility operations health — real-time occupancy, incident status, maintenance impact, capacity utilization
WORKFLOW: —

LAYOUT:

- **Live occupancy panel** (no date filter — always real-time):
  - Facility-wide: total guests (SUM `zone_telemetry.current_occupancy`) / total capacity (SUM `zones.capacity`) as percentage gauge
  - Per-zone breakdown: zone name, current_occupancy, capacity, load percentage, location group. Color-coded: green (<70%), amber (70-90%), red (>90%)
- Date range selector (nuqs `?range=today|7d|30d`) for remaining sections
- **Incident summary**: open incidents by category group (safety: {n}, medical: {n}, security: {n}, guest: {n}, structural: {n}, equipment: {n}, other: {n}), avg time to resolution (from `incidents` WHERE status = 'resolved': `resolved_at - created_at`), incidents opened vs resolved trend chart (daily for selected period)
- **Maintenance impact**: active maintenance orders with affected device name and zone (from `maintenance_orders` WHERE status = 'active' JOIN `devices` JOIN `zones`), scheduled maintenance upcoming this week
- **Capacity utilization**: for selected date range, avg daily slot utilization percentage (from `time_slots`: AVG(booked_count / COALESCE(override_capacity, capacity_per_slot))), peak day and slot, days where any slot hit 100%

COMPONENTS:

- `OccupancyGauge` — facility-wide percentage gauge
- `ZoneOccupancyGrid` — per-zone load cards
- `IncidentSummary` — category breakdown + trend chart
- `MaintenanceImpact` — active/scheduled WO list with zone context
- `CapacityUtilization` — utilization metrics and peak analysis

DATA LOADING:

- RSC fetches:
  - `zone_telemetry` (latest per zone — live, not period-filtered)
  - `zones` JOIN `locations` (capacity, grouping)
  - `incidents` (aggregates by category, resolution time, period trend)
  - `maintenance_orders` JOIN `devices` JOIN `zones` (active + scheduled)
  - `time_slots` JOIN `experiences` (utilization aggregates for period)
- Dehydrated React Query
- Real-time: Supabase Realtime subscription on `zone_telemetry` (INSERT) for live occupancy panel

INTERACTIONS:

- No mutations — read-only
- Period selector via nuqs (does not affect live occupancy panel)

DOMAIN GATING:

- Requires `ops:r`

TABLES TOUCHED:

- SELECT: `zone_telemetry`, `zones`, `locations`, `incidents`, `maintenance_orders`, `devices`, `time_slots`, `experiences`

### `/admin/costs`

WHO: `inventory` domain with `r` access
PURPOSE: Cost and waste analysis — inventory value, COGS, waste trends, top wasted materials
WORKFLOW: —

LAYOUT:

- Date range selector (nuqs `?range=7d|30d|90d|custom`, default: 30d) with comparison toggle
- **Inventory value strip** (3 cards): total inventory on hand (SUM `stock_balance_cache.stock_value`), total COGS for period (SUM `goods_movement_items.total_cost` WHERE movement_type code = '601'), total waste cost for period (SUM `write_offs.total_cost`)
- **Waste analysis section**:
  - Waste by reason (donut: `expired` | `damaged` | `contaminated` | `preparation_error` | `overproduction` | `quality_defect` from `write_offs.reason`)
  - Top 10 wasted materials by cost (horizontal bar from `write_offs` JOIN `materials` GROUP BY material_id ORDER BY SUM total_cost DESC)
  - Waste trend: daily waste cost line chart for selected period vs prior period
  - Waste as % of COGS: (`SUM write_offs.total_cost` / `SUM goods_movement_items.total_cost WHERE MT 601`) × 100 — the key ratio a facility owner tracks
- **Inventory composition**: stock value by location (horizontal bar from `stock_balance_cache` GROUP BY location_id JOIN `locations`), stock value by material_type (from `stock_balance_cache` JOIN `materials`)

COMPONENTS:

- `CostKPIs` — 3 top-line cost cards
- `WasteByReason` — donut chart
- `TopWastedMaterials` — horizontal bar chart
- `WasteTrend` — line chart with period comparison
- `WasteToCOGS` — single prominent metric with trend arrow
- `InventoryComposition` — value distribution charts

DATA LOADING:

- RSC fetches:
  - `stock_balance_cache` JOIN `locations` JOIN `materials` (inventory value aggregates)
  - `goods_movements` JOIN `goods_movement_items` JOIN `movement_types` WHERE code = '601' (COGS for period)
  - `write_offs` JOIN `materials` (waste aggregates by reason, by material, trend)
- Dehydrated React Query

INTERACTIONS:

- No mutations — read-only
- Period selector via nuqs → React Query refetch

DOMAIN GATING:

- Requires `inventory:r`

TABLES TOUCHED:

- SELECT: `stock_balance_cache`, `material_valuation`, `goods_movements`, `goods_movement_items`, `movement_types`, `write_offs`, `materials`, `locations`

### `/admin/guests`

WHO: `reports` domain with `r` access
PURPOSE: Guest satisfaction deep-dive — NPS tracking, score distributions, complaint themes, response rates
WORKFLOW: —

LAYOUT:

- Date range selector (nuqs `?range=30d|90d|custom`, default: 30d) with comparison toggle
- **Satisfaction KPIs** (4 cards): NPS score (promoters % minus detractors %, from `nps_score`: 9-10 = promoter, 7-8 = passive, 0-6 = detractor), avg overall rating ({n}/10), total responses (COUNT), response rate (responses / completed bookings × 100)
- **NPS breakdown**: promoter / passive / detractor bar as stacked horizontal, with period comparison
- **Score distribution**: histogram of `overall_score` values (0-10 buckets)
- **Sentiment trend**: daily avg overall_score line chart for the period
- **Complaint themes**: top keywords from `survey_responses.keywords` JSONB aggregated across responses (word cloud or ranked list), filtered to negative sentiment (overall_score ≤ 6)
- **By survey channel**: response counts by `source` (in_app | email | kiosk | qr_code) — helps the owner understand which feedback channel is most active
- **By experience**: avg scores grouped by experience (from `survey_responses` JOIN `bookings` JOIN `experiences`) — identifies which experience areas need attention

COMPONENTS:

- `SatisfactionKPIs` — 4 top-line cards
- `NPSBreakdown` — promoter/passive/detractor stacked bar
- `ScoreDistribution` — histogram
- `SentimentTrend` — daily avg score line chart
- `ComplaintThemes` — keyword frequency from negative responses
- `ChannelBreakdown` — response count by source
- `ExperienceScores` — avg score per experience

DATA LOADING:

- RSC fetches:
  - `survey_responses` (all aggregates: NPS calc, score distribution, keyword extraction, sentiment trend, channel counts)
  - `bookings` JOIN `experiences` (for response rate denominator and experience grouping)
- Dehydrated React Query

INTERACTIONS:

- No mutations — read-only
- Period selector via nuqs → React Query refetch

DOMAIN GATING:

- Requires `reports:r`

TABLES TOUCHED:

- SELECT: `survey_responses`, `bookings`, `experiences`

### `/admin/workforce`

WHO: `hr` domain with `r` access
PURPOSE: Workforce overview — headcount, attendance compliance, leave utilization, exception trends
WORKFLOW: —

LAYOUT:

- Date range selector (nuqs `?range=7d|30d|custom`, default: 30d)
- **Headcount strip** (4 cards): total active staff (COUNT `profiles` WHERE employment_status = 'active'), by access_level breakdown (admin/manager/crew from `roles.access_level`), new hires this period (COUNT `staff_records` WHERE created_at in range), departures this period (COUNT `profiles` WHERE employment_status IN ('terminated') AND updated_at in range)
- **Attendance compliance section**:
  - Attendance rate for period: (COUNT derived_status IN ('completed','in_progress') / COUNT total scheduled) × 100 from `v_shift_attendance`
  - Attendance rate trend: daily attendance rate line chart
  - Unjustified exceptions by type: breakdown bar (Late Arrival, Early Departure, Missing Clock In, Missing Clock Out, Absent from `attendance_exceptions` WHERE status = 'unjustified')
  - Top 5 staff with most unjustified exceptions this period (from `attendance_exceptions` JOIN `profiles`)
- **Leave utilization section**:
  - Avg leave utilization: (SUM absolute used_days / SUM accrued_days) × 100 from `v_leave_balances` for current fiscal year
  - Staff currently on leave (COUNT `profiles` WHERE employment_status = 'on_leave')
  - Leave balance distribution: how many staff have >80% balance remaining vs <20% (identifies under-utilization and exhaustion risk)
- **Headcount by department**: horizontal bar of staff count per `org_units` (top-level departments)

COMPONENTS:

- `HeadcountKPIs` — 4 headcount cards
- `AttendanceCompliance` — rate metric, trend chart, exception breakdown
- `ExceptionLeaderboard` — top 5 staff with most exceptions (anonymized or name-visible per policy)
- `LeaveUtilization` — utilization metric, on-leave count, balance distribution
- `DepartmentDistribution` — headcount by org unit bar chart

DATA LOADING:

- RSC fetches:
  - `profiles` JOIN `roles` (headcount by status, access_level)
  - `staff_records` (new hires by created_at)
  - `v_shift_attendance` (attendance rate aggregates, daily trend)
  - `attendance_exceptions` JOIN `profiles` (exception counts by type, top offenders)
  - `v_leave_balances` (utilization aggregates)
  - `org_units` JOIN `profiles` (department distribution)
- Dehydrated React Query

INTERACTIONS:

- No mutations — read-only
- Period selector via nuqs → React Query refetch

DOMAIN GATING:

- Requires `hr:r`

TABLES TOUCHED:

- SELECT: `profiles`, `staff_records`, `roles`, `org_units`, `v_shift_attendance`, `attendance_exceptions`, `v_leave_balances`

### 2c. Shared Admin Routes

| Route                  | Page Title       | Domain    | minAccess | Data Tables / RPCs                                              | WF Ref |
| ---------------------- | ---------------- | --------- | --------- | --------------------------------------------------------------- | ------ |
| `/admin/reports`       | Report Generator | `reports` | `r`       | `reports`, `report_executions`, `generate-report` Edge Function | WF-18  |
| `/admin/audit`         | System Audit Log | `reports` | `r`       | `system_audit_log` (unfiltered — admins see all entity_types)   | —      |
| `/admin/announcements` | Announcements    | `comms`   | `r`       | `announcements`, `announcement_targets`, `announcement_reads`   | WF-16  |
| `/admin/attendance`    | Attendance       | `hr`      | `c`       | Shared `AttendancePage` (see Cross-Portal Shared Components)    | WF-5   |
| `/admin/settings`      | Settings         | —         | —         | `profiles` (own record), `rpc_update_own_avatar`                | —      |

### `/admin/reports`

Shared `DomainReportsPage` component — see Section 6 for full expansion. Admins see all 25 report types (all domains).

### `/admin/audit`

Shared `DomainAuditTable` component — see Section 6 for full expansion. Admins see all entity_types (unfiltered).

### `/admin/announcements`

Shared `AnnouncementsPage` component — see Section 6 for full expansion. Admins with `comms:c` can create, manage, and target announcements.

### `/admin/attendance`

Shared `AttendancePage` component — see Section 6 for full expansion. Identical 3-tab layout: Clock In/Out, My Exceptions, My Attendance.

### `/admin/settings`

Shared `SettingsPage` component — see Section 6 for full expansion. Edit own profile, avatar, theme toggle.

---

## 3. Management Portal (`/management/*`)

Routes organized by **data domain**, not by role. A manager sees sidebar items based on which domains their role grants with `minAccess: 'c'` (or `'r'` for shared routes).

### 3a. POS Domain — `/management/pos/`

**Sidebar visible when:** `pos:c`

| Route                              | Page Title        | Domain | minAccess | Data Tables / RPCs                                                                              | WF Ref |
| ---------------------------------- | ----------------- | ------ | --------- | ----------------------------------------------------------------------------------------------- | ------ |
| `/management/pos`                  | POS Points        | `pos`  | `c`       | `pos_points`, `locations`                                                                       | —      |
| `/management/pos/[id]`             | POS Point Detail  | `pos`  | `c`       | `material_sales_data`, `display_categories`, `materials`, `bom_components`, `bill_of_materials` | WF-13  |
| `/management/pos/[id]/modifiers`   | Modifier Groups   | `pos`  | `c`       | `pos_modifier_groups`, `pos_modifier_options`, `material_modifier_groups`                       | WF-13  |
| `/management/pos/orders`           | Order Monitoring  | `pos`  | `r`       | `orders`, `order_items`, `order_item_modifiers`                                                 | WF-13  |
| `/management/pos/price-lists`      | Price Lists       | `pos`  | `c`       | `price_lists`, `price_list_items`, `materials`, `pos_points`                                    | —      |
| `/management/pos/price-lists/[id]` | Price List Detail | `pos`  | `c`       | `price_list_items`, `materials`                                                                 | —      |
| `/management/pos/bom`              | Bill of Materials | `pos`  | `c`       | `bill_of_materials`, `bom_components`, `materials`                                              | —      |
| `/management/pos/bom/[id]`         | BOM Detail        | `pos`  | `c`       | `bill_of_materials`, `bom_components`, `materials`                                              | —      |

### `/management/pos`

WHO: `pos` domain with `c` access
PURPOSE: Manage POS point configuration — the physical registers/terminals where sales occur
WORKFLOW: —

LAYOUT:

- KPI row: "Active terminals: {n}/{total}" | "Today's orders: {total}" | "Today's revenue: ${total}"
- Data table of `pos_points`
- Columns: name, display_name, location, today's order count, last order time, today's revenue, is_active

COMPONENTS:

- `POSPointTable` — CRUD data table
- `POSPointForm` — create/edit form

DATA LOADING:

- RSC fetches a single JOIN against the canonical aggregate VIEW `v_pos_point_today_stats` (migration-defined): `pos_points` LEFT JOIN `v_pos_point_today_stats` USING (id) LEFT JOIN `locations` (name). The view exposes `pos_point_id`, `order_count_today`, `revenue_today`, `last_order_at` computed in one pass. Per-row sub-queries from `orders` are FORBIDDEN (see preamble: Aggregate query discipline).
- Dehydrated React Query; tag `pos:points`.

INTERACTIONS:

- Create/Edit: form → Server Action → INSERT/UPDATE `pos_points` (name, display_name, location_id, is_active) → `revalidatePath`
- Click row → navigate to `/management/pos/[id]`

DOMAIN GATING:

- CRUD requires `system:c`/`system:u` (pos_points are system-domain, not pos-domain in RLS)

TABLES TOUCHED:

- SELECT: `pos_points`, `locations`, `orders`
- INSERT: `pos_points`
- UPDATE: `pos_points`

### `/management/pos/[id]`

WHO: `pos` domain with `c` access
PURPOSE: Configure a POS point's catalog, display categories, and view BOM linkages
WORKFLOW: WF-13

LAYOUT:

- Master-detail: POS point header + tabbed content (nuqs `?tab=menu|categories|recipes`)
- **Menu Items tab:** data table of `material_sales_data` WHERE pos_point_id = this point. Columns include: display_name, selling_price, display_category, is_active, sold last 7d (from `order_items`), revenue last 7d
- **Display Categories tab:** data table of `display_categories` WHERE pos_point_id = this point
- **Recipes tab:** per menu item, shows linked `bom_components` via `bill_of_materials`. Shows "No recipe required" for `material_type NOT IN ('finished', 'semi_finished')`

COMPONENTS:

- `CatalogTable` — CRUD for `material_sales_data`
- `DisplayCategoryTable` — CRUD for `display_categories`
- `BOMPreview` — read-only BOM component list per catalog item

DATA LOADING:

- RSC fetches: `material_sales_data` WHERE pos_point_id JOIN `materials` JOIN `display_categories`, `bill_of_materials` WHERE parent_material_id IN (catalog materials) AND status = 'active' AND is_default = TRUE, `bom_components`, `order_items` (aggregated sold count + revenue per material for last 7d)
- Dehydrated React Query

INTERACTIONS:

- Catalog CRUD: form fields — material_id (select from `materials`), display_name, selling_price (CHECK >= 0), display_category_id (select from `display_categories` for this pos_point), image_url, allergens, sort_order, is_active → Server Action → INSERT/UPDATE `material_sales_data` → `revalidatePath`
- Display Categories CRUD: fields — name (unique per pos_point), sort_order → Server Action → INSERT/UPDATE `display_categories` → `revalidatePath`
- BOM tab: read-only. Shows "No BOM required" for `material_type NOT IN ('finished', 'semi_finished')`

DOMAIN GATING:

- CRUD requires `pos:c`/`pos:u`

TABLES TOUCHED:

- SELECT: `material_sales_data`, `display_categories`, `materials`, `bill_of_materials`, `bom_components`, `order_items`
- INSERT: `material_sales_data`, `display_categories`
- UPDATE: `material_sales_data`, `display_categories`

### `/management/pos/[id]/modifiers`

WHO: `pos` domain with `c` access
PURPOSE: Configure modifier groups and options used to customize POS items (size, milk type, extras)
WORKFLOW: WF-13

LAYOUT:

- List of `pos_modifier_groups` (global — no pos_point_id, reusable across points)
- Per group: expandable list of `pos_modifier_options`
- Assignment section: `material_modifier_groups` junction linking groups to materials

COMPONENTS:

- `ModifierGroupTable` — CRUD data table
- `ModifierOptionTable` — nested CRUD per group
- `ModifierAssignment` — junction manager for `material_modifier_groups`

DATA LOADING:

- RSC fetches: `pos_modifier_groups`, `pos_modifier_options` JOIN `materials` (for material_id display), `material_modifier_groups` JOIN `materials`
- Dehydrated React Query

INTERACTIONS:

- Group CRUD: fields — name, display_name, min_selections (CHECK >= 0), max_selections (CHECK >= 1), sort_order, is_active → Server Action → INSERT/UPDATE `pos_modifier_groups` → `revalidatePath`
- Option CRUD: fields — name (unique per group_id), price_delta, material_id (optional, dropdown from `materials`), quantity_delta, sort_order, is_active → Server Action → INSERT/UPDATE `pos_modifier_options` → `revalidatePath`
- Assignment: multi-select → Server Action → INSERT/DELETE `material_modifier_groups` (material_id, modifier_group_id, sort_order) → `revalidatePath`

DOMAIN GATING:

- CRUD requires `pos:c`/`pos:u`

TABLES TOUCHED:

- SELECT: `pos_modifier_groups`, `pos_modifier_options`, `material_modifier_groups`, `materials`
- INSERT: `pos_modifier_groups`, `pos_modifier_options`, `material_modifier_groups`
- UPDATE: `pos_modifier_groups`, `pos_modifier_options`
- DELETE: `material_modifier_groups`

### `/management/pos/orders`

WHO: `pos` domain with `r` access
PURPOSE: Monitor active and recent POS orders across all points
WORKFLOW: WF-13

LAYOUT:

- KPI row: "Active: {n}" | "Completed today: {n}" | "Avg ticket: ${amount}" | "Avg prep time: {duration}"
- Status tabs with counts (nuqs `?status=preparing`): Preparing ({n}) | Completed | Cancelled
- Within each tab: filters by pos_point, search. Completed and Cancelled tabs add date range filter (nuqs `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`, default: today)
- Default sort: Preparing = created_at ASC (oldest first, FIFO); Completed/Cancelled = created_at DESC
- Columns: order ID prefix, pos_point display_name, total_amount, payment_method, items count, elapsed time (live ticker for preparing), created_at

COMPONENTS:

- `OrderMonitorTable` — filterable data table with expandable rows showing `order_items` + `order_item_modifiers`

DATA LOADING:

- RSC fetches: `orders` JOIN `pos_points` (display_name), `order_items` JOIN `materials` (name), `order_item_modifiers`
- Dehydrated React Query, filters via nuqs
- Cursor-based pagination (keyset on `orders.created_at`, `orders.id`) for Completed and Cancelled tabs
- Real-time: Supabase Realtime subscription on `orders` (INSERT, UPDATE) — completed/cancelled orders appear live

INTERACTIONS:

- Expand row to view line items and modifier selections
- "Cancel Order" inline action (preparing status only, with confirmation modal + reason) → Server Action → UPDATE `orders` SET status = 'cancelled' → `revalidatePath`. Gated by `pos:u`

DOMAIN GATING:

- Requires `pos:r`

TABLES TOUCHED:

- SELECT: `orders`, `order_items`, `order_item_modifiers`, `pos_points`, `materials`
- UPDATE: `orders` (status — cancel action)

### 3b. Procurement Domain — `/management/procurement/`

**Sidebar visible when:** `procurement:c`

| Route                                          | Page Title        | Domain        | minAccess | Data Tables / RPCs                                             | WF Ref |
| ---------------------------------------------- | ----------------- | ------------- | --------- | -------------------------------------------------------------- | ------ |
| `/management/procurement`                      | Materials         | `procurement` | `c`       | `materials`, `material_procurement_data`, `suppliers`, `units` | —      |
| `/management/procurement/[id]`                 | Material Detail   | `procurement` | `c`       | `materials`, `material_procurement_data`, `uom_conversions`    | —      |
| `/management/procurement/reorder`              | Reorder Dashboard | `procurement` | `c`       | `rpc_reorder_dashboard()`                                      | WF-9   |
| `/management/procurement/purchase-orders`      | Purchase Orders   | `procurement` | `c`       | `purchase_orders`, `purchase_order_items`                      | WF-9   |
| `/management/procurement/purchase-orders/[id]` | PO Detail         | `procurement` | `c`       | `purchase_order_items`, `materials`, `units`                   | WF-9   |
| `/management/procurement/suppliers`            | Suppliers         | `procurement` | `c`       | `suppliers`, `material_procurement_data`                       | —      |
| `/management/procurement/suppliers/[id]`       | Supplier Detail   | `procurement` | `r`       | `suppliers`, `material_procurement_data`, `purchase_orders`    | —      |

### `/management/procurement`

WHO: `procurement` domain with `c` access
PURPOSE: Master material registry for procurement — view all materials with supplier and unit data
WORKFLOW: —

LAYOUT:

- KPI row: "Needs ordering: {n}" (on_hand ≤ reorder_point) | "No supplier assigned: {n}" | "On order: {n}" (materials with open PO lines) | "Avg lead time: {days}" (from default supplier `lead_time_days`)
- Data table of `materials` with joined procurement data
- Columns: name, SKU, material_type, category, base_unit, default supplier, on hand (from `stock_balance_cache`), reorder alert indicator (on_hand <= reorder_point), is_active
- Filters: material_type, category (tree selector), search (nuqs `?q=`: searches name, SKU, barcode)

COMPONENTS:

- `MaterialTable` — filterable data table
- `MaterialCreateForm` — create form

DATA LOADING:

- RSC fetches: `materials` JOIN `material_categories` (name) JOIN `units` AS base_unit (abbreviation), LEFT JOIN `material_procurement_data` (default supplier), LEFT JOIN `suppliers` (name), `stock_balance_cache` aggregate
- Dehydrated React Query

INTERACTIONS:

- Create: form → Server Action → INSERT `materials` (name, sku, barcode, material_type, category_id, base_unit_id, reorder_point, safety_stock, standard_cost, valuation_method, shelf_life_days, storage_conditions, weight_kg, is_returnable, is_active) → `revalidatePath`
- Click row → navigate to `/management/procurement/[id]`

DOMAIN GATING:

- CRUD requires `procurement:c`/`procurement:u` or `pos:c`/`pos:u` (RLS allows both)

TABLES TOUCHED:

- SELECT: `materials`, `material_procurement_data`, `suppliers`, `units`, `material_categories`, `stock_balance_cache`
- INSERT: `materials`

### `/management/procurement/[id]`

WHO: `procurement` domain with `c` access
PURPOSE: Detailed material view with supplier assignments and UOM conversions
WORKFLOW: —

LAYOUT:

- Tabbed layout (nuqs `?tab=info|suppliers|uom`)
- **Info tab:** material fields (editable)
- **Suppliers tab:** `material_procurement_data` CRUD for this material
- **UOM Conversions tab:** `uom_conversions` WHERE material_id = this material + global conversions (read-only)

COMPONENTS:

- `MaterialInfoForm` — editable material fields
- `SupplierAssignmentTable` — CRUD per-material supplier data
- `UOMConversionTable` — material-specific + global conversions

DATA LOADING:

- RSC fetches: `materials` WHERE id = param, `material_procurement_data` WHERE material_id JOIN `suppliers` JOIN `units`, `uom_conversions` WHERE material_id = param OR material_id IS NULL
- Dehydrated React Query

INTERACTIONS:

- Info edit: form fields — name, sku, barcode, material_type, category_id, base_unit_id, reorder_point (CHECK >= 0), safety_stock (CHECK >= 0), standard_cost, valuation_method (Standard | Moving Average | FIFO), shelf_life_days, storage_conditions, weight_kg, is_returnable, is_active → Server Action → UPDATE `materials` → `revalidatePath`
- Supplier CRUD: fields — supplier_id (FK to `suppliers`), supplier_sku, cost_price (CHECK >= 0), purchase_unit_id (FK to `units`), lead_time_days (CHECK >= 0), min_order_qty, is_default toggle → Server Action → INSERT/UPDATE `material_procurement_data` → `revalidatePath`. Zod rule: exactly 1 row must have `is_default = TRUE` (enforced by partial unique index `idx_material_procurement_one_default`)
- UOM Conversion CRUD: fields — from_unit_id, to_unit_id (selects from `units`), factor (CHECK > 0) → Server Action → INSERT/UPDATE `uom_conversions` → `revalidatePath`

DOMAIN GATING:

- Material edit: `procurement:u` or `pos:u`. Supplier data: `procurement:c`/`procurement:u`. UOM: `system:c` or `procurement:c`

TABLES TOUCHED:

- SELECT: `materials`, `material_procurement_data`, `suppliers`, `units`, `uom_conversions`
- UPDATE: `materials`
- INSERT: `material_procurement_data`, `uom_conversions`
- UPDATE: `material_procurement_data`, `uom_conversions`

### `/management/procurement/reorder`

WHO: `procurement` domain with `c` access
PURPOSE: Reorder dashboard showing stock levels vs reorder points with draft PO creation
WORKFLOW: WF-9

LAYOUT:

- KPI row: "Items below reorder: {n}" | "Estimated order value: ${total}" | "Suppliers affected: {n}"
- Data table from single RPC call
- Columns: Material, SKU, Category, Default Supplier, 30-Day Usage, On Hand, On Order, Effective Stock, Reorder Point, Reorder Qty (editable inline)
- Checkbox selection per row + "Create Draft POs" action button

COMPONENTS:

- `ReorderDashboardTable` — data table with editable reorder_amt and row selection
- `CreateDraftPOsDialog` — receiving location dropdown + confirmation

DATA LOADING:

- RSC calls: `rpc_reorder_dashboard()` → returns all columns in one query
- Dehydrated React Query

INTERACTIONS:

- Edit reorder_amt: inline numeric input (client-side only, used for PO creation)
- "Create Draft POs": select materials (checkboxes) + receiving_location_id (dropdown from `locations`) → Server Action → groups selected materials by default supplier → creates one `purchase_orders` (status = 'draft', supplier_id, receiving_location_id) per supplier + `purchase_order_items` per material (expected_qty = CEIL(reorder_amt / uom_conversions.factor), unit_price from material_procurement_data.cost_price) → `revalidatePath`

DOMAIN GATING:

- Requires `procurement:c`

TABLES TOUCHED:

- SELECT: via `rpc_reorder_dashboard()` (reads `materials`, `stock_balance_cache`, `material_procurement_data`, `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_movement_items`)
- INSERT: `purchase_orders`, `purchase_order_items`
- RPCs: `rpc_reorder_dashboard()`

### `/management/procurement/purchase-orders`

WHO: `procurement` domain with `c` access
PURPOSE: List and manage all purchase orders
WORKFLOW: WF-9

LAYOUT:

- KPI row: "Open PO value: ${total}" | "Due this week: {n}" | "Overdue: {n}" (expected_delivery_date < today AND status IN ('sent', 'partially_received'))
- Status tabs with counts (nuqs `?status=sent`): Draft ({n}) | Sent ({n}) | Receiving ({n}) | Completed | Cancelled
- Status badge display: draft → "Draft", sent → "Sent", partially_received → "Receiving", completed → "Completed", cancelled → "Cancelled"
- Within each tab: filters by supplier, search
- Default sort: Sent/Receiving = expected_delivery_date ASC; Draft = created_at DESC; Completed/Cancelled = created_at DESC
- Columns: supplier name, status badge, order_date, expected_delivery_date, receiving_location, item count, total value (SUM expected_qty × unit_price), delivery status indicator (on-time / due soon / overdue)

COMPONENTS:

- `PurchaseOrderTable` — filterable data table
- `PurchaseOrderCreateForm` — create form

DATA LOADING:

- RSC fetches: `purchase_orders` JOIN `suppliers` (name) JOIN `locations` (name), COUNT `purchase_order_items`
- Dehydrated React Query, filters via nuqs
- Cursor-based pagination (keyset on `purchase_orders.created_at`, `purchase_orders.id`) for Completed and Cancelled tabs

INTERACTIONS:

- Create: form → Server Action → INSERT `purchase_orders` (supplier_id, receiving_location_id, order_date, expected_delivery_date, notes) → `revalidatePath`
- Status transitions: draft → sent (mark as sent), partially_received → completed (force complete for short-ships)
- Bulk "Mark as Sent": select multiple draft POs → bulk action button → Server Action → batch UPDATE status = 'sent' → `revalidatePath`
- Click row → navigate to `/management/procurement/purchase-orders/[id]`

DOMAIN GATING:

- CRUD requires `procurement:c`/`procurement:u`

TABLES TOUCHED:

- SELECT: `purchase_orders`, `purchase_order_items`, `suppliers`, `locations`
- INSERT: `purchase_orders`
- UPDATE: `purchase_orders` (status)

### `/management/procurement/purchase-orders/[id]`

WHO: `procurement` domain with `c` access
PURPOSE: PO detail with line items, status management, and receiving status tracking
WORKFLOW: WF-9

LAYOUT:

- Header: supplier name, status badge, order_date, expected_delivery_date, receiving_location name, total PO value
- Supplier contact card (inline): contact_email, contact_phone from `suppliers` — so the manager can call about delivery issues without navigating away
- Line items table: material name, expected_qty, received_qty (with progress bar), unit_price, line total, photo_proof_url
- Receiving history section: `goods_movements` WHERE purchase_order_id = this PO, showing received_by, date, quantities per line
- Status lifecycle: `draft` → `sent` → `partially_received` → `completed` | `cancelled`

COMPONENTS:

- `POHeader` — PO metadata and status badge
- `POLineItemTable` — line items with received_qty progress indicators

DATA LOADING:

- RSC fetches: `purchase_orders` WHERE id = param JOIN `suppliers` JOIN `locations`, `purchase_order_items` WHERE po_id = param JOIN `materials` (name) JOIN `units` (abbreviation)
- Dehydrated React Query

INTERACTIONS:

- Edit PO (draft only): fields — expected_delivery_date, notes → Server Action → UPDATE `purchase_orders` → `revalidatePath`
- Add line items (draft only): material_id, expected_qty, unit_price → Server Action → INSERT `purchase_order_items` → `revalidatePath`
- Mark as sent: button → Server Action → UPDATE `purchase_orders` SET status = 'sent' → `revalidatePath`
- Force complete: button (visible when status = 'partially_received') → Server Action → UPDATE `purchase_orders` SET status = 'completed' → `revalidatePath`
- Cancel: button → Server Action → UPDATE `purchase_orders` SET status = 'cancelled' → `revalidatePath`
- Remove line item (draft only): delete button per row → confirmation → Server Action → DELETE `purchase_order_items` → `revalidatePath`
- PO receiving done by runner_crew at `/crew/logistics/po-receiving`

DOMAIN GATING:

- View requires `procurement:r`; mutations require `procurement:u`

TABLES TOUCHED:

- SELECT: `purchase_orders`, `purchase_order_items`, `materials`, `suppliers` (contact fields), `locations`, `units`, `goods_movements`, `goods_movement_items`
- INSERT: `purchase_order_items`
- UPDATE: `purchase_orders`, `purchase_order_items`

### `/management/procurement/suppliers`

WHO: `procurement` domain with `c` access
PURPOSE: Supplier registry management
WORKFLOW: —

LAYOUT:

- KPI row: "Active: {n}" | "Inactive: {n}" | "Open POs: {n}" | "Avg actual lead time: {days}" (from PO `order_date` to first linked `goods_movements.document_date`, lets procurement compare quoted vs actual lead times)
- Data table of `suppliers`
- Columns: name, contact_email, contact_phone, is_active, material count, open POs (COUNT), last order date (from `purchase_orders`), is_active
- Filters: is_active toggle, search (nuqs `?q=`: searches name, contact_email)
- Empty state: "No suppliers registered. [Add Supplier]" (CTA opens create form, visible when user has `procurement:c`)

COMPONENTS:

- `SupplierTable` — CRUD data table
- `SupplierForm` — create/edit form

DATA LOADING:

- RSC fetches: `suppliers`, COUNT `material_procurement_data` per supplier
- Dehydrated React Query

INTERACTIONS:

- Create/Edit: fields — name, contact_email, contact_phone, address, description, is_active → Server Action → INSERT/UPDATE `suppliers` → `revalidatePath`
- Click row → navigate to `/management/procurement/suppliers/[id]`

DOMAIN GATING:

- CRUD requires `procurement:c`/`procurement:u`/`procurement:d`

TABLES TOUCHED:

- SELECT: `suppliers`, `material_procurement_data`
- INSERT: `suppliers`
- UPDATE: `suppliers`

### `/management/procurement/suppliers/[id]`

WHO: `procurement` domain with `r` access
PURPOSE: Supplier detail with linked materials and purchase order history
WORKFLOW: —

LAYOUT:

- Header: supplier name, contact info, status
- Materials section: `material_procurement_data` WHERE supplier_id = this supplier
- PO history section: `purchase_orders` WHERE supplier_id = this supplier ORDER BY order_date DESC. Cursor-based pagination (keyset on `order_date` DESC, `id`, nuqs `?po_cursor=`) — long-term suppliers may have 100+ POs

COMPONENTS:

- `SupplierDetail` — supplier info card
- `SupplierMaterialList` — linked materials with cost_price, lead_time
- `SupplierPOHistory` — purchase order list

DATA LOADING:

- RSC fetches: `suppliers` WHERE id = param, `material_procurement_data` WHERE supplier_id JOIN `materials` (name, sku), `purchase_orders` WHERE supplier_id ORDER BY order_date DESC
- Dehydrated React Query

INTERACTIONS:

- Edit supplier: inline form → Server Action → UPDATE `suppliers` → `revalidatePath`

DOMAIN GATING:

- Requires `procurement:r`

TABLES TOUCHED:

- SELECT: `suppliers`, `material_procurement_data`, `materials`, `purchase_orders`
- UPDATE: `suppliers`

### 3c. HR Domain — `/management/hr/`

**Sidebar visible when:** `hr:c`

| Route                              | Page Title        | Domain | minAccess | Data Tables / RPCs                                                                                                               | WF Ref      |
| ---------------------------------- | ----------------- | ------ | --------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `/management/hr`                   | Staff Management  | `hr`   | `c`       | `staff_records`, `profiles`, `org_units`, `roles`                                                                                | WF-1        |
| `/management/hr/[id]`              | Staff Detail      | `hr`   | `c`       | `staff_records`, `profiles`, `leave_policies`, `equipment_assignments`                                                           | WF-1, WF-20 |
| `/management/hr/shifts`            | Shift Scheduling  | `hr`   | `c`       | `shift_types`, `roster_templates`, `roster_template_shifts`, `staff_roster_assignments`, `shift_schedules`, `v_shift_attendance` | WF-6        |
| `/management/hr/attendance/ledger` | Attendance Ledger | `hr`   | `r`       | `v_shift_attendance` VIEW                                                                                                        | WF-5        |
| `/management/hr/attendance/leaves` | Leave Management  | `hr`   | `c`       | `v_leave_balances` VIEW, `leave_requests`, `leave_ledger`, `leave_types`, `leave_policies`, `leave_policy_entitlements`          | WF-4        |
| `/management/hr/attendance/queue`  | Discrepancy Queue | `hr`   | `r`       | `attendance_exceptions`                                                                                                          | WF-5        |

### `/management/hr`

WHO: `hr` domain with `c` access
PURPOSE: Staff management — list/org-chart views, new hire initiation
WORKFLOW: WF-1

LAYOUT:

- KPI row: "Active: {n}" | "On leave: {n}" | "Pending onboard: {n}" | "Contracts expiring ≤30d: {n}"
- Toggle: List view (default) / Org Chart view
- **List view:** status tabs with counts (nuqs `?status=active`): Active (default) | Pending | On Leave | Suspended | Terminated
- Within each tab: filters by org_unit (tree selector), role, search (nuqs `?q=`: searches display_name, employee_id, legal_name)
- Default sort: display_name ASC
- Columns: display_name, employee_id, role, org_unit, contract_start, contract_end
- **Org Chart view:** tree visualization of `org_units` with staff cards nested under each node
- "New Hire" action button

COMPONENTS:

- `StaffTable` — filterable data table
- `OrgChartView` — tree visualization with staff cards
- `NewHireForm` — Sheet/wizard for creating staff_records

DATA LOADING:

- RSC fetches: `staff_records` JOIN `profiles` (display_name, employee_id, employment_status) JOIN `roles` (display_name) JOIN `org_units` (name, path)
- Dehydrated React Query

INTERACTIONS:

- "New Hire": form → Server Action → INSERT `staff_records` (legal_name, personal_email, phone, address, org_unit_id, contract_start, contract_end, kin_name, kin_relationship, kin_phone) → trigger `trg_auto_create_iam_request` fires → INSERT `iam_requests` (request_type = 'provisioning', status = 'pending_it') → `revalidatePath`
- Click row → navigate to `/management/hr/[id]`

DOMAIN GATING:

- List requires `hr:r` (Tier 4 RLS: own record + org_unit_path scoped); create requires `hr:c`

TABLES TOUCHED:

- SELECT: `staff_records`, `profiles`, `roles`, `org_units`
- INSERT: `staff_records` (trigger creates `iam_requests`)

### `/management/hr/[id]`

WHO: `hr` domain with `c` access
PURPOSE: Staff detail with profile, leave policy, and equipment custody tabs
WORKFLOW: WF-1, WF-20

LAYOUT:

- Tabbed layout (nuqs `?tab=profile|leave-policy|equipment`)
- **Profile tab:** display_name, email, employee_id, role, org_unit, employment_status, contract_start, contract_end. Inline summary: days present / absent / late this month (from `v_shift_attendance`), open exception count
- **Leave Policy tab:** current balance summary at top (from `v_leave_balances`: per leave type accrued/used/balance). Assigned leave_policy_id (dropdown from `leave_policies`), linked entitlements from `leave_policy_entitlements`
- **Equipment tab:** `equipment_assignments` WHERE assigned_to = staff auth_user_id

COMPONENTS:

- `StaffProfileForm` — editable profile fields
- `LeavePolicyAssignment` — policy selector + entitlement display
- `EquipmentCustodyList` — equipment assignment history

DATA LOADING:

- RSC fetches: `staff_records` WHERE id = param JOIN `profiles` JOIN `roles` JOIN `org_units`, `leave_policies` (for dropdown), `leave_policy_entitlements` WHERE policy_id, `equipment_assignments` WHERE assigned_to JOIN `materials` (name)
- Dehydrated React Query

INTERACTIONS:

- Profile edit: Server Action → UPDATE `staff_records` / `profiles` → `revalidatePath`
- Leave policy assignment: select → Server Action → UPDATE `staff_records` SET leave_policy_id → `revalidatePath`
- Transfer request: button → opens form → Server Action → INSERT `iam_requests` (request_type = 'transfer', current_role_id, target_role_id, hr_remark) → `revalidatePath`
- Termination/Suspension: button → opens form → Server Action → INSERT `iam_requests` (request_type = 'termination' | 'suspension', hr_remark) → `revalidatePath`

DOMAIN GATING:

- View requires `hr:r` (Tier 4 scoped); edit requires `hr:u`

TABLES TOUCHED:

- SELECT: `staff_records`, `profiles`, `roles`, `org_units`, `leave_policies`, `leave_policy_entitlements`, `equipment_assignments`, `materials`, `v_shift_attendance`, `v_leave_balances`, `attendance_exceptions`
- UPDATE: `staff_records`, `profiles`
- INSERT: `iam_requests`

### `/management/hr/shifts`

WHO: `hr` domain with `c` access
PURPOSE: Complete shift scheduling — roster templates, schedule overview, and daily overrides
WORKFLOW: WF-6

LAYOUT:

- 3-tab layout (nuqs `?tab=templates|overview|daily`)
- **Tab 1: "Roster Templates"** — template CRUD + shift dictionary + staff assignment + "Save & Apply"
- **Tab 2: "Schedule Overview"** — KPI row: total shifts this week, staff coverage count, overrides count, unfilled days. Date range filter (default: current week), sorted by shift_date ASC then expected_start_time ASC. Read-only data table
- **Tab 3: "Daily Editor"** — single-day drill-down for one-off changes
- Public Holidays list panel: all `public_holidays` with holiday_date and name. Edit name / delete holiday (hr:u / hr:d)

COMPONENTS:

- `ShiftDictionary` — CRUD for `shift_types`
- `RosterTemplateList` — CRUD for `roster_templates`
- `RosterTemplateEditor` — grid of cycle_length_days columns × shift_type cells
- `StaffAssignmentTable` — CRUD for `staff_roster_assignments`
- `SaveApplyDialog` — preview dialog with date range picker
- `ScheduleOverviewTable` — read-only data table with filters
- `DailyEditor` — date picker + staff list with shift dropdown per row

DATA LOADING:

- RSC fetches: `shift_types`, `roster_templates`, `roster_template_shifts`, `staff_roster_assignments` JOIN `staff_records` JOIN `profiles`, `shift_schedules` JOIN `v_shift_attendance`
- Schedule Overview tab: cursor-based pagination (keyset on `shift_date`, `staff_record_id`)
- Dehydrated React Query

INTERACTIONS:

- Shift Dictionary CRUD: fields — code (unique), name, start_time (TIME), end_time (TIME), break_duration_minutes (CHECK >= 0), color (hex), grace_late_arrival_minutes (CHECK >= 0), grace_early_departure_minutes (CHECK >= 0), max_late_clock_in_minutes (CHECK >= 0), max_early_clock_in_minutes (CHECK >= 0), max_late_clock_out_minutes (CHECK >= 0), is_active → Server Action → INSERT/UPDATE `shift_types` → `revalidatePath`
- Template CRUD: fields — name (unique), cycle_length_days (CHECK > 0 AND <= 366), anchor_date (DATE), is_active → Server Action → INSERT/UPDATE `roster_templates` → `revalidatePath`
- Template Editor: shift_type dropdown per day_index cell → Server Action → INSERT/UPDATE/DELETE `roster_template_shifts` (template_id, day_index, shift_type_id) → `revalidatePath`. Trigger `trg_validate_day_index` enforces day_index <= cycle_length_days
- Staff Assignment: fields — staff_record_id, roster_template_id, effective_start_date, effective_end_date (NULL = indefinite) → Server Action → INSERT/UPDATE `staff_roster_assignments` → `revalidatePath`. EXCLUDE constraint prevents overlapping assignments
- "Save & Apply": Server Action → `rpc_preview_pattern_change(p_from_date, p_to_date, p_staff_record_ids := NULL)` → returns JSONB {affected_staff_count, shifts_to_insert, shifts_to_update, stale_rest_day_rows, work_day_overrides} → three options:
  1. "Done" — close dialog
  2. "Apply" — `rpc_apply_pattern_change(p_from_date, p_to_date, p_force_all := FALSE, p_staff_record_ids := NULL)` → `revalidatePath`
  3. "Reset All" — `rpc_apply_pattern_change(p_from_date, p_to_date, p_force_all := TRUE, p_staff_record_ids := NULL)` — warning dialog required → `revalidatePath`
- Daily Editor: change shift → Server Action → UPDATE `shift_schedules` SET shift_type_id → trigger `trg_shift_schedule_mark_override` auto-sets is_override = TRUE → optional reason dialog for override_reason → `revalidatePath`
- "Mark Day Off": date + name → Server Action → `rpc_mark_day_off(p_date, p_name)` → INSERT `public_holidays` (ON CONFLICT update name) → `revalidatePath`

DOMAIN GATING:

- View requires `hr:r`; template/assignment CRUD requires `hr:c`; apply/daily edit requires `hr:u`; mark day off requires `hr:c`

TABLES TOUCHED:

- SELECT: `shift_types`, `roster_templates`, `roster_template_shifts`, `staff_roster_assignments`, `shift_schedules`, `v_shift_attendance`, `staff_records`, `profiles`, `public_holidays`
- INSERT: `shift_types`, `roster_templates`, `roster_template_shifts`, `staff_roster_assignments`, `shift_schedules`, `public_holidays`
- UPDATE: `shift_types`, `roster_templates`, `roster_template_shifts`, `staff_roster_assignments`, `shift_schedules`
- DELETE: `roster_template_shifts`, `staff_roster_assignments`, `public_holidays`
- RPCs: `rpc_preview_pattern_change(p_from_date, p_to_date, p_staff_record_ids)`, `rpc_apply_pattern_change(p_from_date, p_to_date, p_force_all, p_staff_record_ids)`, `rpc_mark_day_off(p_date, p_name)`

### `/management/hr/attendance/ledger`

WHO: `hr` domain with `r` access
PURPOSE: Read-only attendance ledger showing all shift attendance records with derived status
WORKFLOW: WF-5

LAYOUT:

- KPI row (for selected date range): "Scheduled: {n}" | "Present: {n}" | "Late: {n}" | "Absent: {n}" | "On leave: {n}"
- Date range filter (default: today) + status filter as primary. Collapsible "More Filters": org_unit, role, shift_type
- Default sort: shift_date DESC, status (problems first within each day)
- Columns: staff name, shift_date, shift name, expected start/end, clock in/out times, total hours (formatted HH:MM from gross_worked_seconds), net hours (HH:MM from net_worked_seconds), status (from derived_status), issues (from exception_types)

COMPONENTS:

- `AttendanceLedgerTable` — filterable read-only data table

DATA LOADING:

- RSC fetches: `v_shift_attendance` JOIN `profiles` (display_name) JOIN `roles` (display_name) JOIN `org_units` (name)
- Cursor-based pagination (keyset on `shift_date` DESC, `staff_record_id`)
- Dehydrated React Query

INTERACTIONS:

- "Void Punch" action (inline per punch row, visible with `hr:u`): confirmation modal showing punch details → Server Action → UPDATE `timecard_punches` SET voided_at = NOW(), voided_by = auth.uid() → partial unique index releases the slot → new correcting punch can be inserted → surgical `revalidatePath`
- **"Approve without request"** (ADR-0007 — ledger row action, available on `unjustified` exceptions only): modal → `hr_note` → Server Action → `rpc_justify_exception(p_exception_id, p_reason)` → status = `justified` → surgical `revalidatePath`. This is the unilateral-approval path for system-outage cases where every staff member is affected and no per-person submission is warranted. The queue surface does NOT expose this path; it lives here.
- **"Convert to Leave"** (absent / missing_clock_in rows): `rpc_convert_exception_to_leave` — same as on the queue. Accepts both `unjustified` and `pending_review` sources per ADR-0007.

DOMAIN GATING:

- Requires `hr:r` (Tier 4 RLS scopes by org_unit_path on underlying shift_schedules)
- "Approve without request" + "Convert to Leave" + "Void Punch" require `hr:u`

TABLES TOUCHED:

- SELECT: `v_shift_attendance` (view over `shift_schedules`, `shift_types`, `timecard_punches`, `leave_requests`, `public_holidays`, `attendance_exceptions`)
- UPDATE: `timecard_punches` (voided_at, voided_by — void action); `attendance_exceptions` (via RPCs — approve / convert)

### `/management/hr/attendance/leaves`

WHO: `hr` domain with `c` access
PURPOSE: Leave management — requests, balances, ledger, and policy configuration
WORKFLOW: WF-4

LAYOUT:

- 5-tab layout with count badges (nuqs `?tab=requests|balances|history|policies|types`):
  - **Requests ({pending_count})** — data table, default filter `status = 'pending'`. Columns: staff name, leave type, dates, days, reason, status
  - **Balances** — read-only from `v_leave_balances` VIEW
  - **Balance History** — append-only log with manual entry form. Transaction types displayed as: "Added" (accrual), "Used" (usage), "Adjusted" (adjustment), "Carried Forward" (carry_forward), "Forfeited" (forfeiture)
  - **Policy Setup** — CRUD `leave_policies` + `leave_policy_entitlements`
  - **Leave Types** — CRUD `leave_types`: code (unique), name, is_paid (boolean), is_active. Gated by `hr:c`/`hr:u`/`hr:d`

COMPONENTS:

- `LeaveRequestTable` — filterable with approve/reject actions
- `LeaveBalanceTable` — read-only balance view
- `LeaveLedgerTable` — append-only log with manual entry form
- `LeavePolicyManager` — CRUD for policies + entitlements

DATA LOADING:

- RSC fetches: `leave_requests` JOIN `profiles` JOIN `leave_types` JOIN `org_units`, `v_leave_balances`, `leave_ledger` JOIN `leave_types`, `leave_policies`, `leave_policy_entitlements`
- Dehydrated React Query
- Cursor-based pagination on Requests and Balance History tabs (keyset on `created_at` DESC)

INTERACTIONS:

- Approve: button → Server Action → UPDATE `leave_requests` SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW() → trigger `trg_leave_approval_linkage` fires → INSERT `leave_ledger` (transaction_type = 'usage', days = -requested_days) → `revalidatePath`
- Reject: button → modal for `rejection_reason` (required) → Server Action → UPDATE `leave_requests` SET status = 'rejected', rejection_reason, reviewed_by, reviewed_at → `revalidatePath`
- Cancel approved leave: button → Server Action → UPDATE `leave_requests` SET status = 'cancelled', reviewed_by, reviewed_at → trigger fires reversal → INSERT `leave_ledger` (transaction_type = 'adjustment', days = +requested_days) → `revalidatePath`
- Manual ledger entry: form → staff selector, leave_type_id, transaction_type (`accrual` | `usage` | `adjustment` | `carry_forward` | `forfeiture`), days, fiscal_year, notes → Server Action → INSERT `leave_ledger` → `revalidatePath`
- Policy CRUD: fields — name (unique), description, is_active + entitlements (leave_type_id, days_per_year CHECK >= 0, frequency: `annual_upfront` | `monthly_prorated`) → Server Action → INSERT/UPDATE `leave_policies` + `leave_policy_entitlements` → `revalidatePath`

DOMAIN GATING:

- View requires `hr:r`; approve/reject/ledger entry/policy CRUD requires `hr:c`/`hr:u`

TABLES TOUCHED:

- SELECT: `leave_requests`, `v_leave_balances`, `leave_ledger`, `leave_types`, `leave_policies`, `leave_policy_entitlements`, `profiles`, `org_units`
- UPDATE: `leave_requests`
- INSERT: `leave_ledger`, `leave_policies`, `leave_policy_entitlements`, `leave_types`
- UPDATE: `leave_policies`, `leave_policy_entitlements`, `leave_types`
- DELETE: `leave_types`

### `/management/hr/attendance/queue`

**AMENDED BY [ADR-0007](docs/adr/0007-exception-clarification-workflow.md):** scope narrowed to staff-initiated submissions only.

WHO: `hr` domain with `r` access
PURPOSE: HR action-required inbox — approve or reject clarifications staff have explicitly submitted for review.
WORKFLOW: WF-5

LAYOUT:

- KPI bar: submissions awaiting review + SLA indicator (oldest submitted at T-{hours})
- Default sort: `clarification_submitted_at ASC` (FIFO — oldest submission first)
- Columns: staff name, shift_date, shift time, exception type, duration delta, staff's note (staff_clarification), attachments (count + previews), punch note (punch_remark), prior HR note if this is a resubmission, action buttons

COMPONENTS:

- `DiscrepancyQueueTable` — data table with action buttons
- `ApproveModal` — text input mapped to `hr_note`
- `RejectModal` — text input mapped to `hr_note` (rejection reason)
- `ConvertToLeaveModal` — leave_type selector, days input, note
- `AttachmentViewer` — per-row, resolves signed URLs on demand (TTL ≤ 15min)

DATA LOADING:

- RSC fetches: `attendance_exceptions` WHERE `status = 'pending_review'` JOIN `shift_schedules` JOIN `shift_types` JOIN `profiles` (via staff_record_id) LEFT JOIN `attendance_clarification_attachments`
- Partial index `idx_attendance_exceptions_queue` supports the sort
- Cursor-based pagination (keyset on `clarification_submitted_at`, `attendance_exceptions.id`)
- Real-time: Supabase Realtime filter `status=eq.pending_review` — new submissions + resubmissions appear live
- Dehydrated React Query

INTERACTIONS (per ADR-0007 — RPC-based for audit symmetry):

- **Approve** → modal → `hr_note` → Server Action → `rpc_justify_exception(p_exception_id, p_reason)` → status = `justified` → surgical `revalidatePath` per `ATTENDANCE_ROUTER_PATHS`
- **Reject** → modal → `hr_note` (rejection reason) → Server Action → `rpc_reject_exception_clarification(p_exception_id, p_reason)` → status = `rejected` (staff may resubmit, which loops back to `pending_review`)
- **Convert to Leave** — same RPC as before, now accepts `pending_review` source per ADR-0007

Unilateral HR approval (from `unjustified`, no staff submission) lives on the ledger surface, NOT the queue.

DOMAIN GATING:

- View requires `hr:r`; approve/reject/convert requires `hr:u`

TABLES TOUCHED:

- SELECT: `attendance_exceptions`, `shift_schedules`, `shift_types`, `profiles`, `leave_types`
- UPDATE: `attendance_exceptions`
- INSERT: `leave_requests` (via RPC), `leave_ledger` (via trigger)
- RPCs: `rpc_convert_exception_to_leave(p_exception_id, p_leave_type_id, p_days, p_note)`

### 3d. Inventory Domain — `/management/inventory/`

**Sidebar visible when:** `inventory:c`

| Route                                       | Page Title            | Domain                  | minAccess | Data Tables / RPCs                                                      | WF Ref |
| ------------------------------------------- | --------------------- | ----------------------- | --------- | ----------------------------------------------------------------------- | ------ |
| `/management/inventory`                     | Materials & Stock     | `inventory`             | `c`       | `materials`, `stock_balance_cache`, `locations`                         | —      |
| `/management/inventory/categories`          | Material Categories   | `procurement OR pos`    | `c`       | `material_categories` (ltree hierarchy), `location_allowed_categories`  | —      |
| `/management/inventory/uom`                 | UOM Conversions       | `system OR procurement` | `c`       | `uom_conversions`                                                       | —      |
| `/management/inventory/requisitions`        | Requisitions          | `inventory_ops`         | `c`       | `material_requisitions`, `material_requisition_items`, `movement_types` | WF-10  |
| `/management/inventory/requisitions/[id]`   | Requisition Detail    | `inventory_ops`         | `c`       | `material_requisition_items`, `materials`, `movement_types`             | WF-10  |
| `/management/inventory/reconciliation`      | Stock Reconciliation  | `inventory_ops`         | `c`       | `inventory_reconciliations`, `inventory_reconciliation_items`           | WF-11  |
| `/management/inventory/reconciliation/[id]` | Reconciliation Detail | `inventory_ops`         | `c`       | `inventory_reconciliation_items`, `rpc_request_recount`                 | WF-11  |
| `/management/inventory/write-offs`          | Write-Offs            | `inventory_ops OR pos`  | `r`       | `write_offs`, `materials`, `locations`                                  | WF-12  |
| `/management/inventory/equipment`           | Equipment Custody     | `inventory_ops`         | `c`       | `equipment_assignments`, `materials` (WHERE is_returnable = TRUE)       | WF-20  |
| `/management/inventory/movements`           | Goods Movement Ledger | `inventory_ops`         | `r`       | `goods_movements`, `goods_movement_items`, `movement_types`             | —      |
| `/management/inventory/valuation`           | Material Valuation    | `inventory`             | `r`       | `material_valuation`, `stock_balance_cache`                             | —      |

### `/management/inventory`

WHO: `inventory` domain with `c` access
PURPOSE: Materials master list with stock balance overview per location
WORKFLOW: —

LAYOUT:

- KPI row: "Active SKUs: {n}" | "Zero stock: {n}" | "Below reorder: {n}" | "Total inventory value: ${sum}"
- Data table of `materials` JOIN `stock_balance_cache`
- Columns: name, SKU, material_type, category, base_unit, on_hand (SUM current_qty), valuation_method, is_active
- Filters: material type (Raw Material | Semi-Finished | Finished Good | Trading | Consumable | Service), category, location, search (nuqs URL params)
- Drill-down: stock by location grid showing `stock_balance_cache` rows per (material_id, location_id)

COMPONENTS:

- `MaterialStockTable` — data table with expandable location breakdown
- `StockByLocationGrid` — per-material stock at each location

DATA LOADING:

- RSC fetches: `materials` JOIN `material_categories` (name) JOIN `units` (abbreviation), `stock_balance_cache` (aggregated by material_id across locations), `locations`
- Dehydrated React Query

INTERACTIONS:

- No mutations on this page — materials CRUD via `/management/procurement/[id]`
- Click row → expand stock-by-location grid

DOMAIN GATING:

- Requires `inventory:r`

TABLES TOUCHED:

- SELECT: `materials`, `stock_balance_cache`, `locations`, `material_categories`, `units`

### `/management/inventory/categories`

WHO: `procurement` OR `pos` domain with `c` access
PURPOSE: Manage hierarchical material category tree and location-category assignments
WORKFLOW: —

LAYOUT:

- Tree view of `material_categories` using ltree `path` column. Search filter via nuqs `?search=`
- CRUD form as side panel
- Location-category assignment section: `location_allowed_categories` junction

COMPONENTS:

- `CategoryTree` — interactive tree with expand/collapse
- `CategoryForm` — create/edit fields
- `LocationCategoryJunction` — multi-select assignment

DATA LOADING:

- RSC fetches: `material_categories` ORDER BY path, `location_allowed_categories` JOIN `locations`
- Dehydrated React Query

INTERACTIONS:

- Create/Edit: fields — code (unique), name (unique per parent), parent_id, is_bom_eligible, is_consumable, default_valuation, accounting_category, sort_order, is_active → Server Action → INSERT/UPDATE `material_categories` → `revalidatePath`
- Location assignment: multi-select → Server Action → INSERT/DELETE `location_allowed_categories` → `revalidatePath`

DOMAIN GATING:

- CRUD requires `procurement:c` or `pos:c`

TABLES TOUCHED:

- SELECT: `material_categories`, `location_allowed_categories`, `locations`
- INSERT: `material_categories`, `location_allowed_categories`
- UPDATE: `material_categories`
- DELETE: `location_allowed_categories`

### `/management/pos/bom`

WHO: `pos` domain with `c` access
PURPOSE: Bill of Materials management — list all BOMs grouped by parent material. BOMs define recipes (how finished goods like menu items are assembled from raw/semi-finished materials)
WORKFLOW: —

LAYOUT:

- KPI row: "Active BOMs: {n}" | "Drafts pending activation: {n}" | "Finished items without BOM: {n}"
- Data table of `bill_of_materials` grouped by parent_material
- Columns: parent material name, version, effective_from, effective_to, status (`draft` | `active` | `obsolete`), is_default
- Status lifecycle: `draft` → `active` → `obsolete`
- Only one `active + is_default` BOM per parent material (enforced by partial unique index `idx_bom_one_active_default`)

COMPONENTS:

- `BOMListTable` — grouped data table
- `BOMCreateForm` — create new BOM version

DATA LOADING:

- RSC fetches: `bill_of_materials` JOIN `materials` (name, material_type)
- Dehydrated React Query

INTERACTIONS:

- Create: parent_material_id, version, effective_from, effective_to, status, is_default → Server Action → INSERT `bill_of_materials` → `revalidatePath`
- Clone: create new version from existing BOM (draft) — copies component list
- Activate: UPDATE status = 'active' → previous active version auto-set to 'obsolete'
- Click row → navigate to `/management/pos/bom/[id]`

DOMAIN GATING:

- CRUD requires `pos:c`/`pos:u`

TABLES TOUCHED:

- SELECT: `bill_of_materials`, `materials`
- INSERT: `bill_of_materials`
- UPDATE: `bill_of_materials`

### `/management/pos/bom/[id]`

WHO: `pos` domain with `c` access
PURPOSE: BOM detail — manage component list for a specific BOM version
WORKFLOW: —

LAYOUT:

- Header: parent material name, version, effective_from/to, status badge, is_default
- Component list: `bom_components` for this BOM
- Columns: component material name, quantity (CHECK > 0), scrap_pct (CHECK >= 0 AND < 100), is_phantom, sort_order

COMPONENTS:

- `BOMHeader` — BOM metadata
- `BOMComponentTable` — CRUD for components

DATA LOADING:

- RSC fetches: `bill_of_materials` WHERE id = param JOIN `materials` (parent), `bom_components` WHERE bom_id JOIN `materials` (component name)
- Dehydrated React Query

INTERACTIONS:

- Component CRUD: fields — component_material_id (select from `materials`), quantity, scrap_pct, is_phantom, sort_order → Server Action → INSERT/UPDATE `bom_components` → `revalidatePath`. Trigger `trg_bom_component_self_ref_check` prevents circular references
- Phantom components auto-exploded during goods movements (depth guard max 10 levels)
- Version management: clone as new version (draft), activate/obsolete

DOMAIN GATING:

- CRUD requires `pos:c`/`pos:u`

TABLES TOUCHED:

- SELECT: `bill_of_materials`, `bom_components`, `materials`
- INSERT: `bom_components`
- UPDATE: `bom_components`, `bill_of_materials`
- DELETE: `bom_components`

### `/management/inventory/uom`

WHO: `system` OR `procurement` domain with `c` access
PURPOSE: Manage unit-of-measure conversions — global and material-specific
WORKFLOW: —

LAYOUT:

- Two sections:
  1. **Global conversions** (material_id IS NULL): e.g., 1 kg = 1000 g
  2. **Material-specific conversions**: e.g., Material X: 1 carton = 24 pieces
- CRUD form with fields: material_id (optional), from_unit_id, to_unit_id, factor

COMPONENTS:

- `GlobalConversionTable` — CRUD for conversions WHERE material_id IS NULL
- `MaterialConversionTable` — CRUD for material-specific conversions

DATA LOADING:

- RSC fetches: `uom_conversions` LEFT JOIN `materials` (name) JOIN `units` AS from_unit JOIN `units` AS to_unit
- Dehydrated React Query

INTERACTIONS:

- CRUD: fields — material_id (optional, select from `materials`), from_unit_id (select from `units`), to_unit_id (select from `units`), factor (CHECK > 0) → Server Action → INSERT/UPDATE `uom_conversions` → `revalidatePath`
- Units dropdowns are read-only here — units CRUD managed at `/admin/units`

DOMAIN GATING:

- Write: `system:c` or `procurement:c`. Admin sets global conversions; procurement_manager sets supplier packaging conversions

TABLES TOUCHED:

- SELECT: `uom_conversions`, `materials`, `units`
- INSERT: `uom_conversions`
- UPDATE: `uom_conversions`
- DELETE: `uom_conversions`

### `/management/pos/price-lists`

WHO: `pos` domain with `c` access
PURPOSE: Manage selling price lists with effectivity dates — seasonal menus, volume pricing, POS-specific overrides
WORKFLOW: —

LAYOUT:

- Filters: active toggle (nuqs `?active=true`, default: all) — shows only price lists where `valid_from <= today AND (valid_to IS NULL OR valid_to >= today)`
- Data table of `price_lists`
- Columns: name, currency, valid_from, valid_to, is_default, status badge — "Currently Active" (green) when `valid_from <= today AND (valid_to IS NULL OR valid_to >= today) AND is_default = TRUE`, "Active" (blue) when valid but not default, "Expired" (grey) when `valid_to < today`, "Scheduled" (amber) when `valid_from > today`

COMPONENTS:

- `PriceListTable` — CRUD data table

DATA LOADING:

- RSC fetches: `price_lists`
- Dehydrated React Query

INTERACTIONS:

- CRUD: fields — name, currency (default 'MYR'), valid_from (DATE), valid_to (DATE), is_default → Server Action → INSERT/UPDATE `price_lists` → `revalidatePath`
- Click row → navigate to `/management/pos/price-lists/[id]`

DOMAIN GATING:

- CRUD requires `pos:c`/`pos:u`

TABLES TOUCHED:

- SELECT: `price_lists`
- INSERT: `price_lists`
- UPDATE: `price_lists`

### `/management/pos/price-lists/[id]`

WHO: `pos` domain with `c` access
PURPOSE: Manage line items within a price list
WORKFLOW: —

LAYOUT:

- Header: price list name, currency, validity dates, is_default
- Line items table: `price_list_items` for this price list
- Columns: material name, pos_point name (optional), unit_price, min_qty

COMPONENTS:

- `PriceListHeader` — metadata
- `PriceListItemTable` — CRUD for line items

DATA LOADING:

- RSC fetches: `price_lists` WHERE id = param, `price_list_items` WHERE price_list_id JOIN `materials` (name) LEFT JOIN `pos_points` (display_name)
- Dehydrated React Query

INTERACTIONS:

- Line item CRUD: fields — material_id (select from `materials`), pos_point_id (optional, select from `pos_points`), unit_price (CHECK >= 0), min_qty → Server Action → INSERT/UPDATE `price_list_items` → `revalidatePath`
- Bulk add: multi-select materials → Server Action → batch INSERT `price_list_items` → `revalidatePath`

DOMAIN GATING:

- CRUD requires `pos:c`/`pos:u`

TABLES TOUCHED:

- SELECT: `price_lists`, `price_list_items`, `materials`, `pos_points`
- INSERT: `price_list_items`
- UPDATE: `price_list_items`

### `/management/inventory/requisitions`

WHO: `inventory_ops` domain with `c` access
PURPOSE: Manage material requisitions — create manual requisitions, track status
WORKFLOW: WF-10

LAYOUT:

- KPI row: "Oldest pending: {duration}" (age of oldest unfulfilled request) | "Avg fulfillment time: {duration}" (created_at to completed) | "Requested today: {n}"
- Status tabs with counts (nuqs `?status=open`): Open ({n}) | Awaiting Review ({n}) | Completed | Cancelled
- Within each tab: filter by date range, search (nuqs `?q=`: searches to_location name, material names)
- Empty state (Open tab): "No open requisitions. [Create Requisition]" (CTA opens create form, visible when user has `inventory_ops:c`)
- Columns: Source, Destination, Items, Total Qty, Assigned To, Requested, Elapsed

COMPONENTS:

- `RequisitionTable` — filterable data table
- `RequisitionCreateForm` — manual requisition creation

DATA LOADING:

- RSC fetches: `material_requisitions` JOIN `locations` AS from JOIN `locations` AS to LEFT JOIN `profiles` AS assigned (display_name)
- Dehydrated React Query
- Real-time: Supabase Realtime subscription on `material_requisitions` (INSERT, UPDATE) — nice-to-have for seeing new crew requests without refresh

INTERACTIONS:

- Create: select from_location_id, to_location_id (CHECK DISTINCT), add line items with material_id + movement type (Transfer or Consumption — mapped from codes `311`/`201` internally) + requested_qty → Server Action → INSERT `material_requisitions` + INSERT `material_requisition_items` → `revalidatePath`
- Click row → navigate to `/management/inventory/requisitions/[id]`

DOMAIN GATING:

- CRUD requires `inventory_ops:c`

TABLES TOUCHED:

- SELECT: `material_requisitions`, `material_requisition_items`, `locations`, `profiles`, `movement_types`
- INSERT: `material_requisitions`, `material_requisition_items`

### `/management/inventory/requisitions/[id]`

WHO: `inventory_ops` domain with `c` access
PURPOSE: Requisition detail with line items and status tracking
WORKFLOW: WF-10

LAYOUT:

- Header: from/to locations, status badge, assigned_to, requester_remark
- Line items table: material name, movement_type_code, requested_qty, delivered_qty

COMPONENTS:

- `RequisitionDetail` — header + line items

DATA LOADING:

- RSC fetches: `material_requisitions` WHERE id = param, `material_requisition_items` WHERE requisition_id JOIN `materials` (name) JOIN `movement_types` (name, code)
- Dehydrated React Query

INTERACTIONS:

- "Cancel" action (for pending/in_progress) → Server Action → UPDATE `material_requisitions` SET status = 'cancelled' → `revalidatePath`
- "Reassign" action → change assigned_to → Server Action → UPDATE `material_requisitions` SET assigned_to → `revalidatePath`
- Fulfillment managed by runner at `/crew/logistics/restock-queue`

DOMAIN GATING:

- Requires `inventory_ops:r`

TABLES TOUCHED:

- SELECT: `material_requisitions`, `material_requisition_items`, `materials`, `movement_types`, `locations`
- UPDATE: `material_requisitions`

### `/management/inventory/reconciliation`

WHO: `inventory_ops` domain with `c` access
PURPOSE: Stock reconciliation management — create audits, review results, approve adjustments
WORKFLOW: WF-11

LAYOUT:

- KPI row: "Pending review: {n}" | "Discrepancies found this month: {n}" | "Completed this month: {n}"
- Status tabs (nuqs `?status=active`): Active (pending + in_progress) | Pending Review ({n}) | Completed | Cancelled
- Within each tab: filter by location, search (nuqs `?q=`: searches location name)
- Empty state (Active tab): "No active stock counts. [Schedule Count]" (CTA opens create form, visible when user has `inventory_ops:c`)
- Columns: location, scheduled_date, assigned_to, item count, has discrepancies, status

COMPONENTS:

- `ReconciliationTable` — filterable data table
- `ReconciliationCreateForm` — create new reconciliation

DATA LOADING:

- RSC fetches: `inventory_reconciliations` JOIN `locations` (name) LEFT JOIN `profiles` AS assigned (display_name)
- Dehydrated React Query

INTERACTIONS:

- Create: select location_id, scheduled_date, scheduled_time, assigned_to (runner), add items (material_id + system_qty snapshot from `stock_balance_cache`) → Server Action → INSERT `inventory_reconciliations` + INSERT `inventory_reconciliation_items` → `revalidatePath`
- Click row → navigate to `/management/inventory/reconciliation/[id]`

DOMAIN GATING:

- Create requires `inventory_ops:c`

TABLES TOUCHED:

- SELECT: `inventory_reconciliations`, `inventory_reconciliation_items`, `locations`, `profiles`, `stock_balance_cache`
- INSERT: `inventory_reconciliations`, `inventory_reconciliation_items`

### `/management/inventory/reconciliation/[id]`

WHO: `inventory_ops` domain with `c` access
PURPOSE: Review reconciliation results — compare system vs physical quantities, approve or request recount
WORKFLOW: WF-11

LAYOUT:

- Header: location, scheduled_date, status badge, assigned runner, discrepancy status
- Items table: material name, system_qty, physical_qty, variance (physical - system)
- Action buttons: "Approve Adjustments" or "Request Recount" (visible when status = `pending_review`)

COMPONENTS:

- `ReconciliationReviewTable` — items with variance highlighting
- `RequestRecountDialog` — optional new runner selection

DATA LOADING:

- RSC fetches: `inventory_reconciliations` WHERE id = param, `inventory_reconciliation_items` WHERE reconciliation_id JOIN `materials` (name)
- Dehydrated React Query

INTERACTIONS:

- "Approve" action: if any item has physical_qty ≠ system_qty → button labeled "Approve Adjustments", sets discrepancy_found = TRUE. If all items match → button labeled "Confirm Count", sets discrepancy_found = FALSE. Either way: Server Action → UPDATE `inventory_reconciliations` SET status = 'completed', discrepancy_found → trigger `trg_reconciliation_approval_goods_movement` fires → creates `goods_movements` (type 701 positive / 702 negative) per item with variance → `revalidatePath`
- "Request Recount": Server Action → `rpc_request_recount(p_reconciliation_id, p_new_runner_id)` → deletes all items, reverts status to `in_progress`, optionally reassigns runner → `revalidatePath`

DOMAIN GATING:

- Approve/recount requires `inventory_ops:u`

TABLES TOUCHED:

- SELECT: `inventory_reconciliations`, `inventory_reconciliation_items`, `materials`
- UPDATE: `inventory_reconciliations`
- INSERT: `goods_movements`, `goods_movement_items` (via trigger)
- RPCs: `rpc_request_recount(p_reconciliation_id, p_new_runner_id)`

### `/management/inventory/write-offs`

WHO: `inventory_ops` OR `pos` domain with `r` access
PURPOSE: Review waste/disposal records, mark as reviewed
WORKFLOW: WF-12

LAYOUT:

- KPI row: "Unreviewed: {n}" | "Total waste this period: {qty}" | "Top reason: {reason}" | "Estimated cost: ${total}"
- Primary filters: reviewed/unreviewed toggle (default: unreviewed), date range
- Collapsible "More Filters": reason, material, location
- Default sort: unreviewed first, then created_at DESC
- Columns: material name, quantity, reason badge, location, disposed_by, photo indicator, created_at, reviewed status

COMPONENTS:

- `WriteOffTable` — filterable data table with "Mark Reviewed" action

DATA LOADING:

- RSC fetches: `write_offs` JOIN `materials` (name) JOIN `locations` (name) LEFT JOIN `profiles` AS disposed_by (display_name) LEFT JOIN `profiles` AS reviewed_by (display_name)
- Dehydrated React Query
- RLS-scoped: `inventory_ops:r` sees ALL write-offs; `pos:r` sees only POS-relevant materials
- Cursor-based pagination (keyset on `write_offs.created_at` DESC, `write_offs.id`)

INTERACTIONS:

- "Mark Reviewed": button → Server Action → UPDATE `write_offs` SET reviewed_by = auth.uid(), reviewed_at = NOW() → `revalidatePath`

DOMAIN GATING:

- View: `inventory_ops:r` (all write-offs) or `pos:r` (POS-relevant only, via RLS). Mark reviewed: `inventory_ops:u` or `pos:u`

TABLES TOUCHED:

- SELECT: `write_offs`, `materials`, `locations`, `profiles`
- UPDATE: `write_offs` (reviewed_by, reviewed_at)

### `/management/inventory/equipment`

WHO: `inventory_ops` domain with `c` access
PURPOSE: Equipment custody ledger — track returnable asset assignments and returns
WORKFLOW: WF-20

LAYOUT:

- KPI row: "Issued: {n}" | "Oldest unreturned: {duration}" (longest elapsed since assigned_at WHERE returned_at IS NULL) | "Returned this month: {n}"
- Tabs (nuqs `?tab=issued`): Currently Issued (returned_at IS NULL, default) | Return History (returned_at IS NOT NULL)
- Columns: material name, assigned_to (staff display_name), assigned_at, returned_at (history tab), return condition (history tab), notes
- Empty state (Issued tab): "No equipment currently issued. [Issue Equipment]" (CTA opens issue form, visible when user has `inventory_ops:c`)

COMPONENTS:

- `EquipmentCustodyTable` — data table with issue/return actions
- `IssueEquipmentForm` — assign equipment to staff
- `ReturnEquipmentDialog` — return with condition notes

DATA LOADING:

- RSC fetches: `equipment_assignments` JOIN `materials` (name) JOIN `profiles` AS assigned_to (display_name via auth.users id)
- Dehydrated React Query

INTERACTIONS:

- Issue: form → material_id (select from `materials` WHERE is_returnable = TRUE), assigned_to (staff user_id) → Server Action → INSERT `equipment_assignments` (material_id, assigned_to, assigned_at = NOW()) → `revalidatePath`
- Return: dialog → condition_on_return, notes → Server Action → UPDATE `equipment_assignments` SET returned_at = NOW(), condition_on_return, notes → `revalidatePath`

DOMAIN GATING:

- CRUD requires `inventory_ops:c`/`inventory_ops:u`

TABLES TOUCHED:

- SELECT: `equipment_assignments`, `materials`, `profiles`
- INSERT: `equipment_assignments`
- UPDATE: `equipment_assignments`

### `/management/inventory/movements`

WHO: `inventory_ops` domain with `r` access
PURPOSE: Read-only ledger of all goods movements and movement type reference catalog
WORKFLOW: —

LAYOUT:

- Tabbed layout (nuqs `?tab=ledger|types`)
- **Ledger tab:** KPI row for selected period: "Total movements: {n}" | "Inbound: {n}" | "Outbound: {n}" | "Transfers: {n}". Date range as primary filter. Collapsible "More Filters": movement_type, material, location. Data table of `goods_movements` + `goods_movement_items`. Columns: document_date, movement_type name, material, quantity (signed), location, unit_cost, total_cost, source document link
- **Movement Types tab:** reference catalog of `movement_types` (15 rows). Columns: Code, Name, Direction (In | Out | Transfer | Neutral), Description, Source Doc Required, Cost Center Required

COMPONENTS:

- `GoodsMovementLedger` — read-only data table with filters
- `MovementTypeTable` — reference catalog (CRUD for inventory_manager)

DATA LOADING:

- RSC fetches: `goods_movements` JOIN `movement_types` (name, code), `goods_movement_items` JOIN `materials` (name) JOIN `locations` (name) JOIN `units` (abbreviation)
- Cursor-based pagination (keyset on `goods_movements.document_date` DESC, `goods_movements.id`). Highest-volume table — pagination mandatory.
- Dehydrated React Query

INTERACTIONS:

- Ledger: no mutations — read-only. Filters: movement_type, date range, material, location (nuqs URL params)
- Movement Types: CRUD for `inventory:c` — fields: code, name, direction, description, requires_source_doc, requires_cost_center, is_active → Server Action → INSERT/UPDATE `movement_types` → `revalidatePath`

DOMAIN GATING:

- Ledger read: `inventory_ops:r`. Movement type CRUD: `inventory:c`/`inventory:u`

TABLES TOUCHED:

- SELECT: `goods_movements`, `goods_movement_items`, `movement_types`, `materials`, `locations`, `units`
- INSERT: `movement_types`
- UPDATE: `movement_types`

### `/management/inventory/valuation`

WHO: `inventory` domain with `r` access
PURPOSE: Material valuation report — cost analysis per material per location
WORKFLOW: —

LAYOUT:

- KPI row: "Total inventory value: ${sum}" | "Highest-value location: {name} (${value})" | "Highest-value SKU: {name} (${value})"
- Filters: location dropdown (nuqs `?location=`), material_type multi-select (nuqs `?material_type=`)
- Data table of `material_valuation` joined with `stock_balance_cache`
- Columns: material name, location, standard_cost, moving_avg_cost, last_purchase_cost, current_qty, stock_value

COMPONENTS:

- `ValuationTable` — read-only data table

DATA LOADING:

- RSC fetches: `material_valuation` JOIN `materials` (name) JOIN `locations` (name), `stock_balance_cache`
- Dehydrated React Query

INTERACTIONS:

- No mutations — read-only view

DOMAIN GATING:

- Requires `inventory:r`

TABLES TOUCHED:

- SELECT: `material_valuation`, `stock_balance_cache`, `materials`, `locations`

### 3e. Operations Domain — `/management/operations/`

**Sidebar visible when:** `ops:c`

| Route                                | Page Title           | Domain    | minAccess | Data Tables / RPCs                                                                                | WF Ref |
| ------------------------------------ | -------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------- | ------ |
| `/management/operations/incidents`   | Incident Log         | `ops`     | `c`       | `incidents` (safety/medical/security/guest/other categories)                                      | WF-14  |
| `/management/operations/telemetry`   | Zone Telemetry       | `ops`     | `r`       | `zones`, `zone_telemetry`, `crew_zones`                                                           | WF-17  |
| `/management/operations/experiences` | Experience Config    | `booking` | `c`       | `experiences`, `tiers`, `tier_perks`, `experience_tiers`, `scheduler_config`                      | WF-7A  |
| `/management/operations/scheduler`   | Operational Timeline | `booking` | `c`       | `time_slots`, `bookings`, `experiences`, `rpc_preview_slot_override`, `rpc_confirm_slot_override` | WF-8   |
| `/management/operations/vehicles`    | Vehicle Fleet        | `ops`     | `c`       | `vehicles`, `zones`                                                                               | —      |

**Note:** Experience Config and Scheduler routes require `booking:c`, not `ops:c`. Both domains are under `/operations` because operations_manager owns both `ops` and `booking` domains.

### `/management/operations/incidents`

Shared `IncidentLogPage` component — see Section 6 for full expansion. Operations view: safety + medical + security + guest + other groups (20 categories). `ops:c` required. Real-time: Supabase Realtime on `incidents` (INSERT) — nice-to-have, not required (managers check periodically).

### `/management/operations/telemetry`

WHO: `ops` domain with `r` access
PURPOSE: Real-time zone occupancy dashboard — guest counts and staff positions
WORKFLOW: WF-17

LAYOUT:

- Summary KPIs: total guests across all zones, total crew on-site, zones at capacity
- Location groups (collapsible): zones grouped by `zones.location_id` → `locations.name`
- Zone cards: occupancy % (`zone_telemetry.current_occupancy` vs `zones.capacity`), crew count (active `crew_zones` WHERE left_at IS NULL)

COMPONENTS:

- `TelemetryKPIs` — aggregate occupancy summaries
- `LocationGroup` — collapsible zone card container
- `ZoneOccupancyCard` — occupancy gauge + crew count

DATA LOADING:

- RSC fetches: `zones` JOIN `locations`, `zone_telemetry` (latest per zone), `crew_zones` WHERE left_at IS NULL
- Dehydrated React Query
- Real-time: Supabase Realtime subscriptions on `zones` (UPDATE), `crew_zones` (INSERT), `zone_telemetry` (INSERT)

INTERACTIONS:

- No mutations — read-only real-time dashboard

DOMAIN GATING:

- Requires `ops:r`

TABLES TOUCHED:

- SELECT: `zones`, `zone_telemetry`, `crew_zones`, `locations`

### `/management/operations/experiences`

WHO: `booking` domain with `c` access
PURPOSE: Configure experiences, tier templates, and scheduler auto-generation settings
WORKFLOW: WF-7A

LAYOUT:

- 3-tab layout (nuqs `?tab=experiences|tiers|scheduler`)
- **Tab 1: "Experiences"** — list/detail CRUD
- **Tab 2: "Master Tier Templates"** — CRUD `tiers` + `tier_perks`
- **Tab 3: "Scheduler Config"** — per-experience slot generation settings

COMPONENTS:

- `ExperienceTable` — CRUD for experiences
- `TierTemplateTable` — CRUD for tiers
- `TierPerksList` — per-tier perk management
- `SchedulerConfigForm` — per-experience config

DATA LOADING:

- RSC fetches: `experiences`, `tiers`, `tier_perks`, `experience_tiers`, `scheduler_config`
- Dehydrated React Query

INTERACTIONS:

- Experience CRUD: fields — name, capacity_per_slot (CHECK > 0), max_facility_capacity, arrival_window_minutes (CHECK > 0), is_active → Server Action → INSERT/UPDATE `experiences` → `revalidatePath`. Tier assignment via `experience_tiers` junction (multi-select tiers per experience)
- Tier CRUD: fields — name (unique), adult_price (CHECK >= 0), child_price (CHECK >= 0), duration_minutes (CHECK > 0), sort_order → Server Action → INSERT/UPDATE `tiers` → `revalidatePath`

- Tier Perks CRUD: fields — perk (TEXT) → Server Action → INSERT/DELETE `tier_perks` (tier_id, perk) → `revalidatePath`

- Scheduler Config: fields — days_ahead (CHECK > 0 AND <= 90), day_start_hour (CHECK 0-23), day_end_hour (CHECK 1-24, must > day_start_hour), start_date, end_date → Server Action → INSERT/UPDATE `scheduler_config` (experience_id PK) → `revalidatePath`
- "Generate Slots" action (in Scheduler Config tab): date range input → Server Action → `rpc_generate_time_slots(p_experience_id, p_start_date, p_days, p_slot_interval_minutes, p_day_start_hour, p_day_end_hour)` → bulk inserts `time_slots` → `revalidatePath`

DOMAIN GATING:

- CRUD requires `booking:c`/`booking:u`

TABLES TOUCHED:

- SELECT: `experiences`, `tiers`, `tier_perks`, `experience_tiers`, `scheduler_config`
- INSERT: `experiences`, `tiers`, `tier_perks`, `experience_tiers`, `scheduler_config`
- UPDATE: `experiences`, `tiers`, `scheduler_config`
- DELETE: `tier_perks`, `experience_tiers`
- RPCs: `rpc_generate_time_slots(p_experience_id, p_start_date, p_days, p_slot_interval_minutes, p_day_start_hour, p_day_end_hour)`

### `/management/operations/scheduler`

WHO: `booking` domain with `c` access
PURPOSE: Operational timeline — slot utilization, booking calendar, capacity overrides
WORKFLOW: WF-8

LAYOUT:

- Experience selector + date picker
- Utilization bars: `booked_count` vs `COALESCE(override_capacity, capacity_per_slot)` per slot
- Booking calendar: monthly grid showing daily utilization
- Active constraints: slots with `constraint_type IS NOT NULL` highlighted
- "Edit Slot" modal for capacity overrides

COMPONENTS:

- `ExperienceDatePicker` — experience + date selectors
- `SlotUtilizationBar` — per-slot capacity visualization
- `BookingCalendar` — monthly grid view
- `EditSlotModal` — capacity override with cascade preview

DATA LOADING:

- RSC fetches: `time_slots` WHERE experience_id AND slot_date range, `experiences` (capacity_per_slot), `bookings` (aggregates per slot)
- Dehydrated React Query

INTERACTIONS:

- "Edit Slot" modal: fields — override_capacity (new capacity), reason (Maintenance | Private Event | Safety Incident | Weather | Staffing | Other), constraint_notes
  - When new capacity >= booked_count: Server Action → UPDATE `time_slots` SET override_capacity, constraint_type, constraint_notes → `revalidatePath`
  - When new capacity < booked_count (overflow): Server Action → `rpc_preview_slot_override(p_slot_id, p_new_capacity)` → returns cascade plan {booking_id, current_slot, target_slot} → manager reviews → `rpc_confirm_slot_override(p_slot_id, p_new_capacity, p_constraint_type, p_constraint_notes)` → atomically: updates slot + moves overflow bookings + adjusts booked_counts → Edge Function `send-email` (booking_cascaded) → `revalidatePath`
- UI hides write controls when user lacks `booking:u`

DOMAIN GATING:

- View: `booking:r`. Edit: `booking:u`

TABLES TOUCHED:

- SELECT: `time_slots`, `bookings`, `experiences`
- UPDATE: `time_slots` (via RPC)
- UPDATE: `bookings` (time_slot_id, via RPC cascade)
- RPCs: `rpc_preview_slot_override(p_slot_id, p_new_capacity)`, `rpc_confirm_slot_override(p_slot_id, p_new_capacity, p_constraint_type, p_constraint_notes)`

### `/management/operations/vehicles`

WHO: `ops` domain with `c` access
PURPOSE: Vehicle fleet registry management
WORKFLOW: —

LAYOUT:

- KPI row: "Available today: {n}" | "In Maintenance: {n}" | "Next scheduled WO: {date}" (from earliest `maintenance_orders` WHERE status = 'scheduled')
- Status tabs with counts (nuqs `?status=active|maintenance|retired`): Active ({n}) | In Maintenance ({n}) | Retired ({n}). Param values use raw `vehicle_status` ENUM values: `active`, `maintenance`, `retired`
- Columns: name, plate, vehicle_type, zone name, last maintenance date (from `maintenance_orders`)

COMPONENTS:

- `VehicleTable` — CRUD data table

DATA LOADING:

- RSC fetches: `vehicles` LEFT JOIN `zones` (name)
- Dehydrated React Query

INTERACTIONS:

- CRUD: fields — name, plate, vehicle_type, status, zone_id (select from `zones`) → Server Action → INSERT/UPDATE `vehicles` → `revalidatePath`
- Delete vehicle (gated by `ops:d`): confirmation dialog → Server Action → DELETE `vehicles` → `revalidatePath`

DOMAIN GATING:

- CRUD requires `ops:c`/`ops:u`/`ops:d`

TABLES TOUCHED:

- SELECT: `vehicles`, `zones`
- INSERT: `vehicles`
- UPDATE: `vehicles`
- DELETE: `vehicles`

### 3f. Marketing Domain — `/management/marketing/`

**Sidebar visible when:** `marketing:c`

| Route                             | Page Title       | Domain      | minAccess | Data Tables / RPCs                            | WF Ref |
| --------------------------------- | ---------------- | ----------- | --------- | --------------------------------------------- | ------ |
| `/management/marketing/campaigns` | Campaigns        | `marketing` | `c`       | `campaigns`, `promo_codes`                    | —      |
| `/management/marketing/promos`    | Promo Codes      | `marketing` | `c`       | `promo_codes`, `promo_valid_tiers`, `tiers`   | WF-7A  |
| `/management/marketing/surveys`   | Survey Analytics | `marketing` | `r`       | `survey_responses`, `bookings`, `experiences` | —      |

### `/management/marketing/campaigns`

WHO: `marketing` domain with `c` access
PURPOSE: Campaign lifecycle management with promo code linkage
WORKFLOW: —

LAYOUT:

- KPIs: active campaign count, total promo codes, total redemptions (SUM promo_codes.current_uses), total budget
- Data table of `campaigns`
- Columns: name, status (`draft` | `active` | `paused` | `completed`), budget, promo count, start_date, end_date
- Status tabs (nuqs `?status=active`): Draft | Active (default) | Paused | Completed

COMPONENTS:

- `CampaignKPIs` — aggregate metrics
- `CampaignTable` — CRUD data table

DATA LOADING:

- RSC fetches: `campaigns`, COUNT `promo_codes` per campaign_id, SUM `promo_codes.current_uses`
- Dehydrated React Query

INTERACTIONS:

- CRUD: fields — name, description, status, budget (CHECK >= 0), start_date, end_date → Server Action → INSERT/UPDATE `campaigns` → `revalidatePath`
- Status transitions: `draft` → `active` → `paused`. `completed` is frontend-derived display logic (badge shows "Completed" when `end_date < NOW()` AND status = `active` or `paused`) — no database trigger auto-transitions this status
- Delete: gated by `marketing:d`

DOMAIN GATING:

- CRUD requires `marketing:c`/`marketing:u`; delete requires `marketing:d`

TABLES TOUCHED:

- SELECT: `campaigns`, `promo_codes`
- INSERT: `campaigns`
- UPDATE: `campaigns`
- DELETE: `campaigns`

### `/management/marketing/promos`

WHO: `marketing` domain with `c` access
PURPOSE: Promo code management with tier restrictions and temporal validity
WORKFLOW: WF-7A

LAYOUT:

- Status tabs (nuqs `?status=active`): Draft | Active (default) | Expired | Paused
- Filters: campaign, discount_type, search
- Data table of `promo_codes`
- Columns: code, discount display (merged: "15% off" or "RM 10.00 off"), redemptions (current_uses/max_uses as progress), campaign, valid_from/to, status badge

COMPONENTS:

- `PromoCodeTable` — CRUD data table
- `PromoCodeForm` — create/edit with tier assignment

DATA LOADING:

- RSC fetches: `promo_codes` LEFT JOIN `campaigns` (name), `promo_valid_tiers` JOIN `tiers` (name)
- Dehydrated React Query

INTERACTIONS:

- CRUD: fields — code (TEXT, uppercase, unique), description (TEXT, optional — internal note for marketing managers, e.g., "Summer 2026 FB campaign — 15% for families"), discount_type (`percentage` | `fixed`), discount_value (CHECK > 0), max_uses (CHECK > 0), campaign_id (optional FK to `campaigns`), status (`draft` | `active` | `paused` | `completed`), valid_from (TIMESTAMPTZ), valid_to (TIMESTAMPTZ, CHECK > valid_from), valid days (day-of-week multi-select checkboxes; column `promo_codes.valid_days_mask` — bitmask keyed to PostgreSQL `ISODOW` (Mon=ISODOW 1 → bit 0 → value 1; Tue=2; Wed=4; Thu=8; Fri=16; Sat=32; Sun=64); NULL = all days; schema CHECK enforces range 1-127; Zod: `z.number().int().min(1).max(127).nullable()`), valid_time_start (TIME), valid_time_end (TIME), min_group_size (CHECK >= 1) → Server Action → INSERT/UPDATE `promo_codes` → `revalidatePath`
- Valid Tiers: multi-select from `tiers` → Server Action → INSERT/DELETE `promo_valid_tiers` (promo_code_id, tier_id) → `revalidatePath`
- Delete promo code (draft/expired only, gated by `marketing:d`): confirmation dialog → Server Action → DELETE `promo_codes` → `revalidatePath`

DOMAIN GATING:

- CRUD requires `marketing:c`/`marketing:u`

TABLES TOUCHED:

- SELECT: `promo_codes`, `promo_valid_tiers`, `tiers`, `campaigns`
- INSERT: `promo_codes`, `promo_valid_tiers`
- UPDATE: `promo_codes`
- DELETE: `promo_valid_tiers`, `promo_codes`

### `/management/marketing/surveys`

WHO: `marketing` domain with `r` access
PURPOSE: Survey analytics and staff-captured guest feedback review
WORKFLOW: WF-21

LAYOUT:

- Tabs (nuqs `?tab=analytics|staff-feedback`):
  - **Guest Surveys** (default): guest self-submitted responses (`survey_responses` WHERE `staff_submitted = FALSE AND survey_type != 'staff_captured'`)
  - **Staff Feedback**: crew-captured guest feedback (`survey_responses` WHERE `staff_submitted = TRUE AND survey_type = 'staff_captured'`)
- **Guest Surveys tab:**
  - KPIs: total responses, avg overall_score (0-10), avg nps_score (0-10), NPS classification (promoter/passive/detractor breakdown), sentiment distribution
  - Filters: survey_type (`post_visit` | `nps` | `csat` | `exit_survey`), source (`in_app` | `email` | `kiosk` | `qr_code`), date range (nuqs URL params)
  - Keyword aggregation cloud from `survey_responses.keywords` JSONB
- **Staff Feedback tab:**
  - KPIs: "This month: {n}" | "Sentiment: {positive}% positive / {negative}% negative" | "Top theme: {keyword}"
  - Filters: date range, sentiment, search (nuqs URL params)
  - Default sort: created_at DESC
  - Columns: submitted by (staff display_name from `profiles` via `submitted_by`), sentiment badge, feedback text, tags (keywords), rating (overall_score, if provided), linked booking ref (from `bookings.booking_ref` via `booking_id`), date
  - Keyword aggregation from staff feedback responses

COMPONENTS:

- `SurveyKPIs` — aggregate score metrics (guest tab)
- `SurveyFilters` — type, source, date range pickers
- `SentimentChart` — distribution visualization
- `KeywordCloud` — aggregated keywords (per-tab scoped)
- `StaffFeedbackTable` — staff-submitted feedback data table
- `StaffFeedbackKPIs` — monthly count, sentiment split, top theme

DATA LOADING:

- RSC fetches: `survey_responses` LEFT JOIN `bookings` (experience context, booking_ref) LEFT JOIN `experiences` (name) LEFT JOIN `profiles` AS submitted_by (display_name), aggregates
- Dehydrated React Query

INTERACTIONS:

- No mutations — read-only analytics

DOMAIN GATING:

- Requires `marketing:r` (RLS on `survey_responses` accepts `reports:r` OR `marketing:r`)

TABLES TOUCHED:

- SELECT: `survey_responses`, `bookings`, `experiences`, `profiles`

### 3g. Maintenance Domain — `/management/maintenance/`

**Sidebar visible when:** `maintenance:c`

| Route                                     | Page Title            | Domain        | minAccess | Data Tables / RPCs                                                      | WF Ref |
| ----------------------------------------- | --------------------- | ------------- | --------- | ----------------------------------------------------------------------- | ------ |
| `/management/maintenance/orders`          | Work Orders           | `maintenance` | `c`       | `maintenance_orders`, `devices`, `maintenance_vendors`, `staff_records` | WF-15  |
| `/management/maintenance/vendors`         | Vendor Registry       | `maintenance` | `c`       | `maintenance_vendors`                                                   | WF-15  |
| `/management/maintenance/device-topology` | Device Topology       | `it`          | `r`       | `devices`, `device_types`, `locations`, `zones`                         | —      |
| `/management/maintenance/incidents`       | Maintenance Incidents | `ops`         | `r`       | `incidents` (structural + equipment categories only)                    | WF-14  |

### `/management/maintenance/orders`

WHO: `maintenance` domain with `c` access
PURPOSE: Work order lifecycle management — create, schedule, monitor, and close maintenance work orders
WORKFLOW: WF-15

LAYOUT:

- KPI bar: "Active sessions: {n}" | "Scheduled: {n}" | "Overdue: {n}" | "Completed this week: {n}"
- 3-section layout:
  - **Section A: "Live Sessions"** — `status = 'active'`
  - **Section B: "Dispatch Queue"** — `status IN ('draft', 'scheduled')`
  - **Section C: "History"** — `status IN ('completed', 'cancelled')`
- Section focus via nuqs `?section=live|queue|history` (default: `live`)

COMPONENTS:

- `LiveSessionTable` — active WOs with complete/kill actions
- `DispatchQueueTable` — draft/scheduled WOs with edit/cancel
- `WOHistoryTable` — completed/cancelled with filters
- `WorkOrderForm` — create/edit form

DATA LOADING:

- RSC fetches: `maintenance_orders` JOIN `devices` (name) JOIN `maintenance_vendors` (name) LEFT JOIN `staff_records` AS sponsor (legal_name via profiles)
- Dehydrated React Query
- Real-time: Supabase Realtime subscription on `maintenance_orders` (UPDATE) — live session status changes (active → completed) update without refresh

INTERACTIONS:

- Create/Edit: fields — target device (select from `devices`), vendor (select from active `maintenance_vendors`), topology (label: "Work Type", Zod: `z.enum(['remote', 'onsite'])`, display: Remote / On-site), maintenance_start (TIMESTAMPTZ), maintenance_end (TIMESTAMPTZ, CHECK > start), mad_limit_minutes (CHECK > 0), scope (TEXT, textarea, optional — describes the work to be performed during the maintenance window). When on-site: crew sponsor required (select from staff with `maintenance:c`), switch port, network group → Server Action → INSERT/UPDATE `maintenance_orders` → `revalidatePath`
- Status transitions: `draft` → `scheduled` (set maintenance_start/end), `active` → `completed` (set completed_at), any → `cancelled`
- Live session "Complete": UPDATE status = 'completed', completed_at = NOW() → `revalidatePath`
- Live session "Kill Session": UPDATE status = 'cancelled' → `revalidatePath`

DOMAIN GATING:

- CRUD requires `maintenance:c`/`maintenance:u`. Crew sponsor actions at `/crew/maintenance/orders`

TABLES TOUCHED:

- SELECT: `maintenance_orders`, `devices`, `maintenance_vendors`, `staff_records`, `profiles`
- INSERT: `maintenance_orders`
- UPDATE: `maintenance_orders`

### `/management/maintenance/vendors`

WHO: `maintenance` domain with `c` access
PURPOSE: Maintenance vendor registry management
WORKFLOW: WF-15

LAYOUT:

- KPI row: "Available: {n}" (active, no open WOs) | "Busy: {n}" (active, has open WOs) | "Inactive: {n}"
- Data table of `maintenance_vendors`
- Columns: name, contact_email, contact_phone, specialization, open WO count (from `maintenance_orders`), last WO date, is_active
- Empty state: "No vendors registered. [Add Vendor]" (CTA opens create form, visible when user has `maintenance:c`)

COMPONENTS:

- `VendorTable` — CRUD data table

DATA LOADING:

- RSC fetches: `maintenance_vendors`
- Dehydrated React Query

INTERACTIONS:

- CRUD: fields — name, contact_email, contact_phone, specialization, description, is_active → Server Action → INSERT/UPDATE `maintenance_vendors` → `revalidatePath`

DOMAIN GATING:

- CRUD requires `maintenance:c`/`maintenance:u`/`maintenance:d`

TABLES TOUCHED:

- SELECT: `maintenance_vendors`
- INSERT: `maintenance_vendors`
- UPDATE: `maintenance_vendors`

### `/management/maintenance/device-topology`

WHO: `it` domain with `r` access
PURPOSE: Hierarchical device tree visualization organized by location with health status
WORKFLOW: —

LAYOUT:

- Sidebar: location list (from `locations`) with aggregate device health counts
- Main: tree render of `devices` by parent_device_id hierarchy, filtered by selected location (via `devices.zone_id` → `zones.location_id`)
- Each node: device name, device_type display_name, status badge. Offline parent → descendants shown as unreachable
- Node click → detail panel: status, ip_address, mac_address, firmware_version, serial_number, asset_tag, manufacturer, model, commission_date, warranty_expiry, vlan, assigned maintenance vendor, maintenance history

COMPONENTS:

- `LocationSidebar` — location list with health aggregates
- `DeviceTree` — hierarchical tree rendering
- `DeviceDetailPanel` — slide-over with full device info

DATA LOADING:

- RSC fetches: `devices` JOIN `device_types` (display_name) LEFT JOIN `zones` (location_id) LEFT JOIN `locations` (name) LEFT JOIN `maintenance_vendors` (name), `maintenance_orders` WHERE target_ci_id
- Dehydrated React Query

INTERACTIONS:

- "Create Work Order": button on device detail → navigate to `/management/maintenance/orders` with target_ci_id pre-filled
- No device mutations from this view — device CRUD at `/admin/devices`

DOMAIN GATING:

- Requires `it:r`

TABLES TOUCHED:

- SELECT: `devices`, `device_types`, `zones`, `locations`, `vlans`, `maintenance_vendors`, `maintenance_orders`

### `/management/maintenance/incidents`

Shared `IncidentLogPage` component — see Section 6 for full expansion. Maintenance view: structural + equipment groups only (7 categories). `ops:r` required.

### 3h. Shared Management Routes

| Route                       | Page Title       | Domain                                                                               | minAccess | Data Tables / RPCs                                              | WF Ref |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------ | --------- | --------------------------------------------------------------- | ------ |
| `/management/reports`       | Report Generator | `reports`                                                                            | `r`       | `reports`, `report_executions`, `generate-report` Edge Function | WF-18  |
| `/management/audit`         | Domain Audit Log | `reports`                                                                            | `r`       | `system_audit_log` (filtered by domain — see below)             | —      |
| `/management/announcements` | Announcements    | `comms`                                                                              | `r`       | `announcements`, `announcement_targets`, `announcement_reads`   | WF-16  |
| `/management/attendance`    | Attendance       | `hr`                                                                                 | `c`       | Shared `AttendancePage` (see Cross-Portal Shared Components)    | WF-5   |
| `/management/staffing`      | Today's Crew     | any of `hr:r`, `pos:r`, `procurement:r`, `inventory_ops:r`, `ops:r`, `maintenance:r` | `r`       | `shift_schedules`, `v_shift_attendance`, `profiles`, `roles`    | —      |
| `/management/settings`      | Settings         | —                                                                                    | —         | `profiles` (own), `rpc_update_own_avatar`                       | —      |

### `/management/reports`

Shared `DomainReportsPage` component — see Section 6 for full expansion. Report type dropdown filtered by user's domains.

### `/management/audit`

Shared `DomainAuditTable` component — see Section 6 for full expansion. Managers see entity_types filtered by their domains.

### `/management/announcements`

Shared `AnnouncementsPage` component — see Section 6 for full expansion. Managers with `comms:c` can create/manage announcements.

### `/management/attendance`

Shared `AttendancePage` component — see Section 6 for full expansion. Identical 3-tab layout.

### `/management/staffing`

WHO: Any manager holding `r` access on at least one of: `hr`, `pos`, `procurement`, `inventory_ops`, `ops`, `maintenance`.
PURPOSE: Today's crew view with domain filter — single consolidated route replacing the former per-domain staffing pages.
WORKFLOW: —

LAYOUT:

- Summary header: "On-site: {clocked_in}/{scheduled}" | "Late: {n}" | "No-show: {n}"
- Domain filter tabs (nuqs `?domain=all|hr|pos|procurement|inventory_ops|ops|maintenance`). Default: `all` for `hr:r` holders; otherwise first domain the user holds `r` on.
- Tabs are filtered at render time to the domains the caller actually holds `r` on — managers never see domains they cannot read.
- Card grid of crew members scheduled today, filtered by the selected domain's role set. Per card: display_name, employee_id, role display_name, shift window, attendance status — color-coded (green = clocked in, amber = late, red = absent/no-show, grey = not yet started).

COMPONENTS:

- `StaffingDomainTabs` — renders only the domains the caller is authorized for
- `TodaysCrewGrid` — card grid (reuses the existing shared component, now parameterised by the domain selected in URL)

DATA LOADING:

- RSC fetches: `shift_schedules` WHERE shift_date = TODAY JOIN `v_shift_attendance` JOIN `profiles` JOIN `roles`, filtered by the selected domain's role set (single query — no N+1).
- Dehydrated React Query; filter param via nuqs; tag `hr:staffing`.

INTERACTIONS:

- No mutations — read-only view.
- Domain tab change updates `?domain=` and triggers React Query refetch.

DOMAIN GATING:

- Requires `r` on at least one of `hr`, `pos`, `procurement`, `inventory_ops`, `ops`, `maintenance`. The tab picker enforces per-domain visibility; selecting a domain the caller lacks is blocked at middleware (Gate 5) and component level.
- Rationale for consolidation: the three legacy routes (`/management/pos/staffing`, `/management/procurement/staffing`, `/management/hr/staffing`) rendered the same UI with different filters. Collapsing to one route with a URL-scoped filter removes 3 route folders, 3 sidebar entries, and 3 data-fetcher duplicates.

TABLES TOUCHED:

- SELECT: `shift_schedules`, `v_shift_attendance`, `profiles`, `roles`

### `/management/settings`

Shared `SettingsPage` component — see Section 6 for full expansion. Edit own profile, avatar, theme toggle.

---

## 4. Crew Portal (`/crew/*`)

### 4a. Shared Routes (All Crew)

All crew roles have `hr:c,r` and `system:r`. These routes are visible to every crew member.

| Route                 | Page Title       | Domain  | minAccess | Data Tables / RPCs                                               | WF Ref |
| --------------------- | ---------------- | ------- | --------- | ---------------------------------------------------------------- | ------ |
| `/crew/attendance`    | Attendance       | `hr`    | `c`       | Shared `AttendancePage` (see Cross-Portal Shared Components)     | WF-5   |
| `/crew/schedule`      | My Schedule      | `hr`    | `r`       | `shift_schedules` (own staff_record_id)                          | WF-6   |
| `/crew/leave`         | My Leave         | `hr`    | `c`       | `leave_requests`, `v_leave_balances`, `rpc_cancel_leave_request` | WF-4   |
| `/crew/incidents`     | Report Incident  | —       | —         | `incidents`                                                      | WF-14  |
| `/crew/zone-scan`     | Zone Declaration | —       | —         | `crew_zones`, `zones`                                            | WF-17  |
| `/crew/feedback`      | Guest Feedback   | —       | —         | `survey_responses`                                               | WF-21  |
| `/crew/announcements` | Communications   | `comms` | `r`       | `announcements`, `announcement_reads`                            | WF-16  |
| `/crew/settings`      | Profile Settings | —       | —         | `profiles` (own), `rpc_update_own_avatar`                        | —      |

### `/crew/attendance`

Shared `AttendancePage` component — see Section 6 for full expansion. Identical 3-tab layout: Clock In/Out, My Exceptions, My Attendance.

### `/crew/schedule`

WHO: `hr` domain with `r` access
PURPOSE: View own weekly shift schedule
WORKFLOW: WF-6

LAYOUT:

- Week view with prev/next navigation (nuqs `?week=YYYY-Wnn`), today highlighted
- Per day: shift_type name, start/end time. No shift → "Off". Approved leave days shown with distinct "On Leave" marker
- Coworkers: names of other crew in the same org_unit scheduled on the same day (from `shift_schedules` JOIN `profiles`)
- Static header: location derived from `staff_records.org_unit_id → org_units → locations.org_unit_id`

COMPONENTS:

- `WeekScheduleView` — 7-day strip with shift cards
- `WeekNavigation` — prev/next week buttons

DATA LOADING:

- RSC fetches: `shift_schedules` WHERE staff_record_id = own ORDER BY shift_date, JOIN `shift_types` (name, start_time, end_time), `shift_schedules` for same org_unit (coworker names), `leave_requests` WHERE own AND status = 'approved' (leave overlay)
- Direct props

INTERACTIONS:

- No mutations — read-only view
- Week navigation updates date range filter

DOMAIN GATING:

- Requires `hr:r`

TABLES TOUCHED:

- SELECT: `shift_schedules`, `shift_types`, `leave_requests`

### `/crew/leave`

WHO: `hr` domain with `c` access
PURPOSE: View leave balances and manage own leave requests
WORKFLOW: WF-4

LAYOUT:

- **Balances section:** per leave_type: accrued_days, carry_forward_days (from `v_leave_balances`, shown only if > 0), used_days (absolute value), balance
- **Requests section** — two segments:
  - **Pending** (status = 'pending'): actionable — shows cancel button. Sorted by created_at DESC
  - **Past** (approved/rejected/cancelled): read-only history. Sorted by created_at DESC. Filters (nuqs `?year=&leave_type=&past_status=`): year picker (default: current year), leave_type dropdown (from `leave_types`), status filter (approved/rejected/cancelled). Necessary because long-tenured staff accumulate 50+ past requests
- **Full nuqs param set:** `?year=` (integer, default: current), `?leave_type=` (UUID, optional), `?past_status=` (enum: approved|rejected|cancelled, optional)

COMPONENTS:

- `LeaveBalanceCards` — per-type balance display
- `LeaveRequestTable` — own requests with create/cancel
- `LeaveRequestForm` — create new request

DATA LOADING:

- RSC fetches: `v_leave_balances` WHERE staff_record_id = own, `leave_requests` WHERE staff_record_id = own, `leave_types` (for dropdown)
- Dehydrated React Query

INTERACTIONS:

- Create: fields — leave_type_id (dropdown from `leave_types`), start_date, end_date (CHECK start <= end), requested_days (CHECK > 0, supports 0.5 for half-day), reason → Server Action → INSERT `leave_requests` (status = 'pending') → `revalidatePath`. Exclusion constraint prevents overlapping active leaves
- Cancel: button (visible on own pending requests only) → Server Action → `rpc_cancel_leave_request(p_leave_request_id)` → status = 'cancelled' → `revalidatePath`

DOMAIN GATING:

- Requires `hr:c` for create, `hr:r` for view

TABLES TOUCHED:

- SELECT: `v_leave_balances`, `leave_requests`, `leave_types`
- INSERT: `leave_requests`
- RPCs: `rpc_cancel_leave_request(p_leave_request_id)`

### `/crew/incidents`

Shared `IncidentLogPage` component — see Section 6 for full expansion. Crew view: report new incidents (all 27 categories) + view own reported incidents. Summary: "Open: {n}, Resolved: {n}" for own incidents above the list.

### `/crew/zone-scan`

WHO: All crew (no domain gating — Tier 2 universal insert)
PURPOSE: Declare current zone via QR scan for safety tracking
WORKFLOW: WF-17

LAYOUT:

- Camera QR scanner (payload = zone_id UUID)
- Current zone display card
- "Leave Zone" button
- Last 5 zone entries for current shift

COMPONENTS:

- `QRScanner` — camera-based QR reader
- `CurrentZoneCard` — active zone display
- `ZoneHistoryList` — recent entries

DATA LOADING:

- RSC fetches: `crew_zones` WHERE staff_record_id = own AND left_at IS NULL (current zone), last 5 `crew_zones` WHERE staff_record_id = own ORDER BY scanned_at DESC
- Direct props

INTERACTIONS:

- QR scan: decode zone_id → Server Action → if previous zone has `left_at IS NULL`, trigger `trg_crew_zones_auto_close` sets `left_at = NOW()` → INSERT `crew_zones` (staff_record_id, zone_id, scanned_at = NOW()) → `revalidatePath`
- "Leave Zone": button → Server Action → UPDATE `crew_zones` SET left_at = NOW() WHERE staff_record_id = own AND left_at IS NULL → `revalidatePath`

DOMAIN GATING:

- None — all crew can scan (Tier 2 universal insert on `crew_zones`)

TABLES TOUCHED:

- SELECT: `crew_zones`, `zones`
- INSERT: `crew_zones`
- UPDATE: `crew_zones` (left_at)

### `/crew/feedback`

WHO: All crew (no domain gating — facility-wide feature like zone scan)
PURPOSE: Capture guest feedback heard in passing — complaints, compliments, suggestions reported by staff on behalf of guests
WORKFLOW: WF-21

LAYOUT:

- Quick-entry form (mobile-first, vertical stack):
  - Sentiment: 3-option segmented control (Positive | Neutral | Negative) — required
  - "What did the guest say?" — text area (required, min 10 chars)
  - Tags: optional tag input for themes (e.g., "wait time", "staff", "food quality") → stored as `keywords` JSONB
  - Rating: optional 1-10 slider ("How would you rate their mood?") → `overall_score`
  - Booking reference: optional text input — if the crew member knows the guest's booking ref, links the feedback to a booking
- Location auto-detected via `staff_records.org_unit_id → org_units → locations.org_unit_id` (displayed as read-only context, not stored — `survey_responses` has no location column)
- Recent submissions (own, last 10) below the form — cards showing sentiment badge, feedback preview, timestamp
- Empty state: "No feedback submitted yet. Capture what guests are saying!"

COMPONENTS:

- `GuestFeedbackForm` — sentiment + text + tags + optional score + optional booking ref
- `RecentFeedbackList` — own recent submissions

DATA LOADING:

- RSC fetches: `survey_responses` WHERE submitted_by = auth.uid() AND staff_submitted = TRUE ORDER BY created_at DESC LIMIT 10
- Dehydrated React Query

INTERACTIONS:

- Submit: Server Action → resolve booking_id from booking_ref if provided (lookup `bookings` WHERE booking_ref) → INSERT `survey_responses` (survey_type = 'staff_captured', sentiment, feedback_text, keywords, overall_score, booking_id, source = 'in_app', staff_submitted = TRUE, submitted_by = auth.uid()) → `revalidatePath`
- RLS enforces: `staff_submitted = TRUE AND submitted_by = auth.uid()` — crew cannot insert guest-type surveys or impersonate other staff

DOMAIN GATING:

- None — all authenticated staff can submit (Tier 2 universal INSERT policy scoped by `staff_submitted = TRUE`)

TABLES TOUCHED:

- SELECT: `survey_responses` (own recent), `bookings` (booking_ref lookup)
- INSERT: `survey_responses`

### `/crew/announcements`

Shared `AnnouncementsPage` component — see Section 6 for full expansion. Crew with `comms:r` see read-only view.

### `/crew/settings`

Shared `SettingsPage` component — see Section 6 for full expansion.

### 4b. Role-Specific Crew Routes

| Route                           | Page Title          | Domain          | minAccess | Data Tables / RPCs                                                                                                                             | WF Ref |
| ------------------------------- | ------------------- | --------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `/crew/pos`                     | POS Terminal        | `pos`           | `c`       | `material_sales_data`, `display_categories`, `pos_modifier_groups`, `pos_modifier_options`, `material_modifier_groups`, `submit_pos_order` RPC | WF-13  |
| `/crew/active-orders`           | Active Orders (KDS) | `pos`           | `r`       | `orders` (status = preparing), `order_items`, `order_item_modifiers`                                                                           | WF-13  |
| `/crew/entry-validation`        | Ticket Scanner      | `booking`       | `r`       | `rpc_lookup_booking`, `rpc_search_bookings_by_email`, `rpc_checkin_booking`                                                                    | WF-7B  |
| `/crew/restock`                 | Restock Request     | `inventory_ops` | `c`       | `material_requisitions`, `material_requisition_items`, `materials`, `movement_types`                                                           | WF-10  |
| `/crew/logistics/restock-queue` | Restock Queue       | `inventory_ops` | `c`       | `material_requisitions`, `material_requisition_items`                                                                                          | WF-10  |
| `/crew/logistics/po-receiving`  | PO Receiving        | `procurement`   | `u`       | `purchase_orders`, `purchase_order_items`                                                                                                      | WF-9   |
| `/crew/logistics/stock-count`   | Stock Counting      | `inventory_ops` | `r`       | `inventory_reconciliations`, `inventory_reconciliation_items`                                                                                  | WF-11  |
| `/crew/disposals`               | Waste Declaration   | `inventory_ops` | `c`       | `write_offs`, `materials`, `material_sales_data`, `bill_of_materials`                                                                          | WF-12  |
| `/crew/maintenance/orders`      | My Work Orders      | `maintenance`   | `c`       | `maintenance_orders` (filtered by sponsor_id or assigned)                                                                                      | WF-15  |

### `/crew/pos`

WHO: `pos` domain with `c` access
PURPOSE: POS terminal for placing orders — catalog auto-detected from crew's org unit
WORKFLOW: WF-13

LAYOUT:

- Mobile-first POS layout
- Catalog grid: `material_sales_data` filtered by auto-detected pos_point_id, grouped by `display_categories`
- Cart panel: selected items with modifiers, running subtotal
- Payment method selector + checkout button

COMPONENTS:

- `POSCatalog` — item grid grouped by display category
- `ModifierSelector` — per-item modifier group UI
- `POSCart` — cart with quantities and modifier summaries
- `CheckoutPanel` — payment method + submit

DATA LOADING:

- RSC fetches: auto-detect POS point via `staff_records.org_unit_id → org_units → locations.org_unit_id → pos_points.location_id`. If single POS point → load catalog immediately. If multiple at same location → show picker. If chain fails → error state "No POS point assigned."
- `material_sales_data` WHERE pos_point_id AND is_active = TRUE JOIN `materials` JOIN `display_categories`, `material_modifier_groups` JOIN `pos_modifier_groups` JOIN `pos_modifier_options`
- Dehydrated React Query

INTERACTIONS:

- Add to cart: select item → check `material_modifier_groups` for modifier groups → show modifier selection UI per group (enforce min_selections/max_selections) → add to cart with snapshotted option_name, price_delta, material_id, quantity_delta
- Checkout: select payment_method (`cash` | `card` | `face_pay` | `digital_wallet`) → Server Action → `submit_pos_order(p_pos_point_id, p_items, p_payment_method)` → server-side price lookup from `material_sales_data` → INSERT `orders` (status = 'preparing') + `order_items` + `order_item_modifiers` → `revalidatePath`
- No promo codes on POS (promos apply to bookings only)

DOMAIN GATING:

- Requires `pos:c`

TABLES TOUCHED:

- SELECT: `material_sales_data`, `display_categories`, `materials`, `pos_modifier_groups`, `pos_modifier_options`, `material_modifier_groups`, `pos_points`, `locations`, `org_units`, `staff_records`
- INSERT: `orders`, `order_items`, `order_item_modifiers` (via RPC)
- RPCs: `submit_pos_order(p_pos_point_id, p_items, p_payment_method)`

### `/crew/active-orders`

WHO: `pos` domain with `r` access
PURPOSE: Kitchen Display System — real-time view of preparing orders with completion action
WORKFLOW: WF-13

LAYOUT:

- **Overdue section** (pinned top, red header): orders with elapsed > 15 min, sorted oldest first
- **In Queue section**: remaining preparing orders, FIFO (created_at ASC)
- Per card: order ID prefix, item count badge, elapsed time (live ticker), items with modifier names, POS point name

COMPONENTS:

- `KDSOrderCard` — order card with items and timer
- `MarkCompletedButton` — completes order

DATA LOADING:

- RSC fetches: `orders` WHERE status = 'preparing' JOIN `pos_points` (display_name), `order_items` JOIN `materials` (name), `order_item_modifiers`
- Real-time: Supabase Realtime subscription on `orders` (INSERT, UPDATE)

INTERACTIONS:

- "Mark Completed": button → Server Action → UPDATE `orders` SET status = 'completed', completed_at = NOW() → trigger `trg_order_completion_goods_movement` fires (BOM explosion + modifier delta application → stock deduction) → `revalidatePath`

DOMAIN GATING:

- View requires `pos:r`; complete requires `pos:u`

TABLES TOUCHED:

- SELECT: `orders`, `order_items`, `order_item_modifiers`, `pos_points`, `materials`
- UPDATE: `orders` (status, completed_at)

### `/crew/entry-validation`

WHO: `booking` domain with `r` access
PURPOSE: Ticket scanner for guest check-in at entry gate
WORKFLOW: WF-7B

LAYOUT:

- Three lookup methods: QR scan, booking ref text input, email search
- Result display: booking details + attendee list
- Check-in action button

COMPONENTS:

- `QRBookingScanner` — camera QR reader
- `BookingRefInput` — text input for booking_ref
- `EmailSearchInput` — email search with results list
- `BookingResultCard` — booking details display
- `CheckInButton` — check-in action

DATA LOADING:

- On-demand via RPCs (no initial page data)

INTERACTIONS:

- QR scan: decode → Server Action → `rpc_lookup_booking(p_qr_code_ref := scanned_value)` → display result
- Booking ref: text input → Server Action → `rpc_lookup_booking(p_booking_ref := input)` → display result
- Email search: text input → Server Action → `rpc_search_bookings_by_email(p_email := input)` → list results → select one
- Lateness indicator: frontend-derived from slot start_time + `experiences.arrival_window_minutes`
- Check-in: visible when `status = 'confirmed'` or `status = 'no_show'` → Server Action → `rpc_checkin_booking(p_booking_id)` → status = 'checked_in', checked_in_at = NOW() → `revalidatePath`

DOMAIN GATING:

- Requires `booking:r` for lookups; `booking:u` for check-in

TABLES TOUCHED:

- SELECT: via RPCs (reads `bookings`, `time_slots`, `experiences`, `tiers`, `booking_attendees`)
- UPDATE: `bookings` (status, checked_in_at via RPC)
- RPCs: `rpc_lookup_booking(p_qr_code_ref, p_booking_ref)`, `rpc_search_bookings_by_email(p_email)`, `rpc_checkin_booking(p_booking_id)`

### `/crew/restock`

WHO: `inventory_ops` domain with `c` access
PURPOSE: Create restock/material requisition requests for delivery to operational location
WORKFLOW: WF-10

LAYOUT:

- Material multi-select with current stock at location displayed alongside each item (from `stock_balance_cache` WHERE location_id = selected location), requested_qty input per item
- Delivery instruction text field (→ `requester_remark`)
- Location auto-detection for POS crews; dropdown for others
- Recent request history (own, last 10)

COMPONENTS:

- `RestockForm` — material selector + quantity inputs + delivery note
- `LocationSelector` — auto-detected or manual dropdown
- `RecentRequestsList` — own recent requisitions

DATA LOADING:

- RSC fetches: `materials` (for selection), `locations` (for dropdowns), `material_categories` (for is_consumable lookup), own recent `material_requisitions` LIMIT 10, `stock_balance_cache` for the selected location
- Dehydrated React Query
- Location auto-detect: `staff_records.org_unit_id → org_units → locations.org_unit_id`

INTERACTIONS:

- Submit: confirmation dialog showing destination location, items with quantities, and movement types → on confirm → Server Action → INSERT `material_requisitions` (from_location_id = warehouse, to_location_id, requester_remark, status = 'pending') + INSERT `material_requisition_items` per line (material_id, requested_qty, movement_type_code: `201` if `material_categories.is_consumable = TRUE`, else `311`) → `revalidatePath`
- Mixed movement types per-line allowed in single requisition

DOMAIN GATING:

- Requires `inventory_ops:c`

TABLES TOUCHED:

- SELECT: `materials`, `locations`, `material_categories`, `material_requisitions`, `org_units`, `staff_records`, `stock_balance_cache`
- INSERT: `material_requisitions`, `material_requisition_items`

### `/crew/logistics/restock-queue`

WHO: `inventory_ops` domain with `c` access
PURPOSE: Runner picks and fulfills restock requisitions
WORKFLOW: WF-10

LAYOUT:

- **Pending section:** `material_requisitions WHERE status = 'pending'`, sorted by created_at ASC (oldest first). Per row: to_location name (destination), item count, elapsed time since request (e.g., "45 min ago"), requester_remark preview — accept action
- **In Progress section:** own accepted requisitions. Per row: to_location, item list with delivered_qty inputs — deliver action

COMPONENTS:

- `PendingRequisitionList` — available requisitions to accept
- `InProgressRequisitionList` — own active requisitions with delivery form

DATA LOADING:

- RSC fetches: `material_requisitions` WHERE status IN ('pending', 'in_progress') JOIN `locations` JOIN `material_requisition_items` JOIN `materials`
- Real-time: Supabase Realtime subscription on `material_requisitions` (INSERT, UPDATE) — new requests and status changes appear live
- Dehydrated React Query

INTERACTIONS:

- "Accept": Server Action → UPDATE `material_requisitions` SET status = 'in_progress', assigned_to = auth.uid() → `revalidatePath`
- "Mark Delivered": enter delivered_qty per item → Server Action → UPDATE `material_requisition_items` SET delivered_qty + UPDATE `material_requisitions` SET status = 'completed' → trigger `trg_requisition_completion_goods_movement` fires → `revalidatePath`

DOMAIN GATING:

- Requires `inventory_ops:c`/`inventory_ops:u`

TABLES TOUCHED:

- SELECT: `material_requisitions`, `material_requisition_items`, `materials`, `locations`
- UPDATE: `material_requisitions`, `material_requisition_items`

### `/crew/logistics/po-receiving`

WHO: `procurement` domain with `u` access
PURPOSE: Receive goods against purchase orders — enter actual received quantities
WORKFLOW: WF-9

LAYOUT:

- List: `purchase_orders WHERE status IN ('sent', 'partially_received')`
- Expand PO: `purchase_order_items` with material, expected_qty, received_qty, unit
- Per line: numeric input for actual received_qty

COMPONENTS:

- `POReceivingList` — expandable PO list
- `ReceivingLineItem` — per-item qty input

DATA LOADING:

- RSC fetches: `purchase_orders` WHERE status IN ('sent', 'partially_received') JOIN `suppliers` (name), `purchase_order_items` JOIN `materials` (name)
- Real-time: Supabase Realtime subscription on `purchase_orders` (UPDATE) — newly sent POs appear without refresh
- Dehydrated React Query

INTERACTIONS:

- "Receive All" button per PO: pre-fills all received_qty fields with expected_qty. User then adjusts only the lines with discrepancies
- Submit received quantities: Server Action → UPDATE `purchase_order_items` SET received_qty → trigger `trg_po_receive_goods_movement` fires per item → creates `goods_movements` (type 101) + `goods_movement_items` (positive qty at receiving_location_id) → `trg_gmi_a_cache_sync` updates `stock_balance_cache` → PO status auto-transitions → `revalidatePath`

DOMAIN GATING:

- Requires `procurement:u`

TABLES TOUCHED:

- SELECT: `purchase_orders`, `purchase_order_items`, `materials`, `suppliers`
- UPDATE: `purchase_order_items` (received_qty), `purchase_orders` (status via trigger)

### `/crew/logistics/stock-count`

WHO: `inventory_ops` domain with `r` access
PURPOSE: Blind stock count — enter physical quantities without seeing system values
WORKFLOW: WF-11

LAYOUT:

- List: `inventory_reconciliations WHERE status IN ('pending', 'in_progress')` assigned to self
- Per reconciliation: items grouped by `material_categories` name for systematic counting (walk through one shelf/area at a time). Material name and unit shown — system_qty is HIDDEN (blind count)
- Per item: numeric input for physical_qty

COMPONENTS:

- `StockCountList` — assigned reconciliations
- `BlindCountForm` — per-item physical_qty input (system_qty hidden)

DATA LOADING:

- RSC fetches: `inventory_reconciliations` WHERE status IN ('pending', 'in_progress') AND assigned_to = auth.uid(), `inventory_reconciliation_items` JOIN `materials` (name, base_unit)
- Direct props

INTERACTIONS:

- Enter physical_qty per item → Server Action → UPDATE `inventory_reconciliation_items` SET physical_qty → when all items counted: Server Action compares all physical_qty vs system_qty — if any differ → UPDATE status = 'pending_review', discrepancy_found = TRUE; if all match → UPDATE status = 'completed', discrepancy_found = FALSE (this is Server Action logic, not a database trigger) → `revalidatePath`

DOMAIN GATING:

- Requires `inventory_ops:r` (update via `inventory_ops:u`)

TABLES TOUCHED:

- SELECT: `inventory_reconciliations`, `inventory_reconciliation_items`, `materials`
- UPDATE: `inventory_reconciliation_items` (physical_qty), `inventory_reconciliations` (status)

### `/crew/disposals`

WHO: `inventory_ops` domain with `c` access
PURPOSE: Log waste/disposal events with BOM explosion option for finished goods
WORKFLOW: WF-12

LAYOUT:

- Location selector: auto-detected for POS crews, dropdown for others
- Material selector: filtered by `location_allowed_categories` for selected location
- Disposal form fields + photo upload
- explode_bom toggle (for BOM-eligible materials)

COMPONENTS:

- `LocationSelector` — auto-detect or manual
- `DisposalForm` — material, quantity, reason, notes, photo, explode_bom toggle

DATA LOADING:

- RSC fetches: `materials`, `locations`, `location_allowed_categories`, `bill_of_materials` WHERE status = 'active' AND is_default = TRUE (for explode_bom eligibility), `material_valuation` (for unit_cost resolution)
- Dehydrated React Query
- Location auto-detect: `staff_records.org_unit_id → org_units → locations.org_unit_id`

INTERACTIONS:

- Submit: fields — material_id, quantity (CHECK > 0), location_id, reason (`expired` | `damaged` | `contaminated` | `preparation_error` | `overproduction` | `quality_defect`), notes, photo_proof_url (file upload), "Deduct individual ingredients" toggle (labeled plainly — replaces "explode_bom"; default ON for finished/semi-finished items with active recipe, OFF otherwise; hidden for items without a recipe), bom_id (auto-populated when toggle ON)
- Zod validation: `z.object({ explode_bom: z.boolean(), bom_id: z.string().uuid().nullable() }).refine(d => !d.explode_bom || d.bom_id !== null, "Active recipe required when deducting individual ingredients")`
- unit_cost (resolved from `material_valuation`), cost_center_id (optional) → Server Action → INSERT `write_offs` → trigger `trg_write_off_goods_movement` fires (type 551, optional BOM explosion) → `revalidatePath`

DOMAIN GATING:

- Requires `inventory_ops:c`

TABLES TOUCHED:

- SELECT: `materials`, `locations`, `location_allowed_categories`, `bill_of_materials`, `material_valuation`, `material_sales_data`, `org_units`, `staff_records`
- INSERT: `write_offs`

### `/crew/maintenance/orders`

WHO: `maintenance` domain with `c` access
PURPOSE: Crew sponsor view of assigned work orders — authorize vendor access, revoke on completion
WORKFLOW: WF-15

LAYOUT:

- Summary: "Scheduled: {n}" | "Active: {n}"
- List: `maintenance_orders WHERE sponsor_id = own_staff_record_id AND status IN ('scheduled', 'active')`
- Per WO: type (remote/onsite), status badge, vendor name, maintenance window, access time limit (formatted as hours:minutes from mad_limit_minutes), time remaining (live countdown from maintenance_end), device name and location

COMPONENTS:

- `MyWorkOrderList` — filtered WO cards
- `AuthorizeDialog` — MAC address input for vendor authorization
- `RevokeDialog` — sponsor remark input

DATA LOADING:

- RSC fetches: `maintenance_orders` WHERE sponsor_id = own_staff_record_id JOIN `devices` (name) JOIN `maintenance_vendors` (name)
- Dehydrated React Query

INTERACTIONS:

- "Authorize" (onsite, status = 'scheduled'): enter vendor_mac_address (MACADDR format validation) → Server Action → UPDATE `maintenance_orders` SET status = 'active', vendor_mac_address, authorized_at = NOW(), authorized_by = auth.uid() → vendor MAC appears in `get_active_vendors_for_radius()` → `revalidatePath`
- "Revoke" (status = 'active'): enter sponsor_remark → Server Action → UPDATE `maintenance_orders` SET status = 'completed', sponsor_remark, completed_at = NOW() → `revalidatePath`

DOMAIN GATING:

- Requires `maintenance:c`/`maintenance:u` (Tier 3b RLS: sponsor_id match)

TABLES TOUCHED:

- SELECT: `maintenance_orders`, `devices`, `maintenance_vendors`
- UPDATE: `maintenance_orders`

---

## 5. Guest Routes (No Staff Auth)

### 5a. Public Booking Flow

| Route           | Page Title      | Auth Method          | Data Tables / RPCs                                                                                                                   | WF Ref |
| --------------- | --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `/book`         | Book Experience | Anonymous (anon key) | `experiences`, `tiers`, `tier_perks`, `experience_tiers`, `rpc_get_available_slots`, `rpc_validate_promo_code`, `rpc_create_booking` | WF-7A  |
| `/book/payment` | Payment         | Anonymous            | `booking_payments`, payment gateway webhook -> `confirm-booking-payment` Edge Function                                               | WF-7A  |

### `/book`

WHO: Anonymous (anon key)
PURPOSE: Multi-step booking wizard — select experience/tier, choose date/time, enter details, pay
WORKFLOW: WF-7A

LAYOUT:

- Step progress indicator: Experience → Guests → Date → Time → Details → Review. Back navigation enabled between all steps ("← Back" button above step content). All wizard state held in client-side reducer — not URL params (ephemeral guest session).
- Multi-step wizard:
  1. Select experience → show linked tiers with adult_price, child_price, duration_minutes, and perks
  2. Select tier + guest count (adult_count >= 1, child_count >= 0)
  3. Select date → `rpc_get_available_slots` → available slot grid
  4. Select time slot
  5. Enter booker details: name, email, phone
  6. Optional promo code → `rpc_validate_promo_code` → discount preview
  7. Accept Terms & Conditions
  8. Review summary → confirm

COMPONENTS:

- `ExperienceTierSelector` — experience + tier cards with perks
- `GuestCountPicker` — adult/child count inputs
- `SlotCalendar` — date picker + time slot grid
- `BookerDetailsForm` — name, email, phone, promo code
- `BookingSummary` — review card with pricing breakdown
- `PromoCodeInput` — validate + preview discount

DATA LOADING:

- `experiences` WHERE is_active = TRUE (anon-readable), `experience_tiers` → `tiers` (adult_price, child_price, duration_minutes, sort_order), `tier_perks` (perk)
- Dehydrated React Query
- On date select: `rpc_get_available_slots(p_experience_id, p_date, p_tier_id, p_guest_count)` → available slots

INTERACTIONS:

- Promo validation: `rpc_validate_promo_code(p_promo_code, p_tier_id, p_slot_date, p_slot_start_time, p_adult_count, p_child_count)` → returns {valid, reason, discount_amount, final_price}
- Confirm: Server Action (invokes `rpc_create_booking` using service_role key — not client anon key, prevents guest-side parameter manipulation) → atomically: locks slot (SELECT FOR UPDATE), validates capacity + facility max, computes price, validates promo (strict), generates booking_ref ('AG-' + hex + timestamp) and qr_code_ref, INSERTs `bookings` (status = 'pending_payment') + `booking_attendees` (face_pay/auto_capture OFF, nickname NULL) + `booking_payments` (status = 'pending'), increments `time_slots.booked_count` → returns {booking_id, booking_ref, qr_code_ref, total_price} → redirect to `/book/payment`

DOMAIN GATING:

- None — anonymous access via anon key

TABLES TOUCHED:

- SELECT: `experiences`, `tiers`, `tier_perks`, `experience_tiers`, `time_slots`, `promo_codes`, `promo_valid_tiers`
- INSERT: `bookings`, `booking_attendees`, `booking_payments` (via RPC)
- UPDATE: `time_slots` (booked_count), `promo_codes` (current_uses) (via RPC)
- RPCs: `rpc_get_available_slots(...)`, `rpc_validate_promo_code(...)`, `rpc_create_booking(...)`

### `/book/payment`

WHO: Anonymous
PURPOSE: Payment processing page — redirect to gateway, handle webhook confirmation
WORKFLOW: WF-7A

LAYOUT:

- Booking summary sidebar: experience name, tier, date/time, guest count, total price, promo discount (if any)
- Payment gateway integration (redirect or embedded)
- Waiting/processing state
- Success → booking confirmation display
- Failure → retry option

COMPONENTS:

- `PaymentGateway` — gateway integration
- `PaymentStatusDisplay` — processing/success/failure states

DATA LOADING:

- `booking_payments` WHERE booking_id (payment_intent_id for gateway correlation)
- Direct props

INTERACTIONS:

- **Webhook intake** (Edge Function `confirm-booking-payment`, served as a Route Handler — never a Server Action):
  1. **Signature verification** — validate the gateway HMAC header against `PAYMENT_WEBHOOK_SECRET` (env). Invalid signature → respond 401, increment `payment_webhook_invalid_signature_total` metric, log as potential attack. Never process unsigned payloads.
  2. **Idempotency ledger** — parse the gateway's `event_id`. Attempt `INSERT INTO payment_webhook_events (event_id PK, event_type, payment_intent_id, raw_payload JSONB, received_at) ON CONFLICT (event_id) DO NOTHING`. If conflict (duplicate delivery), respond 200 immediately without reprocessing.
  3. **State correlation** — look up `booking_payments` by `payment_intent_id`. Missing or mismatched → respond 200 (do not trigger gateway retry), flag the event as orphaned in the ledger, alert SEV-3.
  4. **Commit** — transactional RPC `rpc_apply_payment_event(p_event_id, p_new_status, p_paid_at)`: atomically updates `booking_payments.status`, advances `bookings.status` to `confirmed` on success, stamps `processed_at` on the webhook row. Respond 200 only after commit.
  5. **Notification** — enqueue `send-email` (booking_confirmation) via the job queue (idempotent by `booking_id`). Never invoked inline — webhook response budget is 5s.
- **Success path:** `booking_payments.status = 'success'`, `bookings.status = 'confirmed'`, `paid_at = NOW()`, confirmation email enqueued, QR code delivered.
- **Failure path:** `booking_payments.status = 'failed'`; booking remains `pending_payment`; user shown retry screen with one-click re-pay (new payment intent).
- **Reconciliation cron (`cron-payment-reconcile`, pg_cron every 5 min — recovers dropped webhooks):** for each `booking_payments.status = 'pending'` older than 2 min, call the gateway's `GET /payment_intents/:id`. If the gateway reports a terminal state (`succeeded` | `failed` | `canceled`) but the DB is still `pending`, synthesize the missed event through the same `rpc_apply_payment_event` — self-heals without user action.
- **Abandonment sweep (`cron-booking-abandon`, pg_cron every 15 min):** cancels `pending_payment` bookings older than 15 min → trigger `trg_booking_status_change` decrements `time_slots.booked_count` and `promo_codes.current_uses`.
- **Dead-letter queue:** webhook events unprocessed after 3 retry attempts move to `payment_webhook_events_dlq` and page on-call SEV-2.
- **Orphan guarantee:** the combination of reconciliation cron + abandonment sweep + DLQ ensures every `pending_payment` row reaches a terminal state within 15 min. No permanent orphans possible.
- **CSRF:** `/book/payment` client-side actions (retry button, cancel) use the anonymous double-submit CSRF token issued on `/book` page load.

DOMAIN GATING:

- None — anonymous

TABLES TOUCHED:

- SELECT: `booking_payments`, `payment_webhook_events`
- INSERT: `payment_webhook_events` (idempotency ledger), `payment_webhook_events_dlq` (on repeated failure)
- UPDATE: `booking_payments`, `bookings` (via `rpc_apply_payment_event`), `payment_webhook_events` (processed_at)
- RPCs: `rpc_apply_payment_event(p_event_id, p_new_status, p_paid_at)`
- Cron: `cron-payment-reconcile` (every 5 min), `cron-booking-abandon` (every 15 min)

### 5b. Guest Booking Management

| Route                           | Page Title          | Auth Method          | Data Tables / RPCs                             | WF Ref |
| ------------------------------- | ------------------- | -------------------- | ---------------------------------------------- | ------ |
| `/my-booking`                   | Booking Lookup      | Anonymous            | `rpc_get_booking_identity`                     | WF-7B  |
| `/my-booking/verify`            | OTP Verification    | Anonymous            | `rpc_verify_otp`                               | WF-7B  |
| `/my-booking/manage`            | My Booking          | Guest session cookie | `rpc_get_booking_by_ref`, `rpc_modify_booking` | WF-7B  |
| `/my-booking/manage/biometrics` | Face Pay Enrollment | Guest session cookie | `biometric_vectors`, `booking_attendees`       | WF-7B  |
| `/my-booking/manage/memories`   | Memories Vault      | Guest session cookie | `captured_photos`                              | WF-7B  |

### `/my-booking`

WHO: Anonymous
PURPOSE: Booking lookup — enter booking_ref to receive OTP for identity verification
WORKFLOW: WF-7B

LAYOUT:

- Single input: booking_ref text field with helper text: "Enter your booking reference (starts with AG-). You can find this in your confirmation email."
- Submit → shows masked email confirmation

COMPONENTS:

- `BookingRefInput` — text input + submit

DATA LOADING:

- None initial

INTERACTIONS:

- Submit: Server Action → `rpc_get_booking_identity(p_booking_ref, p_ip_address)` → validates booking exists + status IN ('confirmed', 'checked_in', 'completed'), rate-limits (max 3 per 15 min), generates OTP, sends via `send-email` (booking_otp) → returns {masked_email, booking_ref, otp_sent} → redirect to `/my-booking/verify`

DOMAIN GATING:

- None — anonymous

TABLES TOUCHED:

- SELECT: `bookings` (via RPC)
- INSERT: `otp_challenges` (via RPC)
- RPCs: `rpc_get_booking_identity(p_booking_ref, p_ip_address)`

### `/my-booking/verify`

WHO: Anonymous
PURPOSE: OTP verification to establish guest session
WORKFLOW: WF-7B

LAYOUT:

- 6-digit OTP input
- Masked email reminder
- Resend OTP link

COMPONENTS:

- `OTPInput` — 6-digit code entry
- `ResendLink` — triggers new OTP

DATA LOADING:

- None — booking_ref from previous step

INTERACTIONS:

- Submit: Server Action → `rpc_verify_otp(p_booking_ref, p_otp_code)` → validates: challenge exists + not expired + attempts < 5 + code matches → marks verified = TRUE → returns {verified: true} → set guest session cookie (httpOnly, secure, sameSite=strict, maxAge=4h, path=/my-booking/manage) → redirect to `/my-booking/manage`

DOMAIN GATING:

- None — anonymous

TABLES TOUCHED:

- SELECT: `otp_challenges` (via RPC)
- UPDATE: `otp_challenges` (verified, attempts via RPC)
- RPCs: `rpc_verify_otp(p_booking_ref, p_otp_code)`

### `/my-booking/manage`

WHO: Guest session cookie (authenticated via OTP)
PURPOSE: View booking details, reschedule, manage attendee preferences
WORKFLOW: WF-7B

LAYOUT:

- Booking details card: booker_name, booking_ref, QR code, slot date/time, tier, experience, guest counts, total_price, status, tier perks list (from `tier_perks`)
- Reschedule policy notice: "You can reschedule up to 2 hours before your entry time." When within 2h: "Rescheduling is no longer available for this booking"
- Reschedule section (visible when status = 'confirmed' and > 2h before slot)
- Attendee roster: per attendee — nickname, Face Pay toggle, Auto-Capture toggle

COMPONENTS:

- `BookingDetailsCard` — full booking info + QR display
- `RescheduleForm` — new date/time slot picker
- `AttendeeRoster` — per-attendee settings

DATA LOADING:

- `rpc_get_booking_by_ref(p_booking_ref)` → booking details + attendees + tier perks
- Dehydrated React Query

INTERACTIONS:

- Reschedule: select new slot → Server Action → `rpc_modify_booking(p_booking_ref, p_new_time_slot_id)` → atomically: validates status + 2h window + new slot capacity + facility max + promo day/time re-validation → swaps booked_count between old/new slots → updates bookings.time_slot_id → sends `send-email` (booking_modified) → `revalidatePath`
- Attendee edit: UPDATE `booking_attendees` SET nickname, face_pay_enabled, auto_capture_enabled → `revalidatePath`

DOMAIN GATING:

- Guest session cookie required (middleware validates)

TABLES TOUCHED:

- SELECT: `bookings`, `booking_attendees`, `tiers`, `tier_perks`, `time_slots` (via RPC)
- UPDATE: `bookings` (time_slot_id via RPC), `booking_attendees`, `time_slots` (booked_count via RPC)
- RPCs: `rpc_get_booking_by_ref(p_booking_ref)`, `rpc_modify_booking(p_booking_ref, p_new_time_slot_id)`

### `/my-booking/manage/biometrics`

WHO: Guest session cookie
PURPOSE: Per-attendee Face Pay biometric enrollment, consent management, and withdrawal
WORKFLOW: WF-7B
REGULATORY BASIS: BIPA §15 (Illinois), GDPR Art. 9(2)(a) (explicit consent for special-category data), PDPA Sec. 6 (Malaysia).

LAYOUT:

- **Consent disclosure card — cannot be skipped, cannot be pre-checked** (required to satisfy BIPA written-release and GDPR Art. 9 explicit-consent standards):
  - **What is captured:** "A mathematical template derived from your face, not the photo itself. The raw photo is discarded after the template is extracted."
  - **Why:** "To authorize in-park purchases via Face Pay and to auto-capture your photos during the visit."
  - **Legal basis:** "Explicit consent under GDPR Art. 9(2)(a), BIPA written release, PDPA Sec. 6."
  - **Retention:** "The template is deleted automatically 24 hours after your visit ends, or immediately when you withdraw consent."
  - **Rights:** "Withdraw at any time. Withdrawal is immediate, deletes your template, and does not affect your booking."
  - **Controller + contact:** operator legal entity name + `privacy@<domain>` + policy version reference.
  - **Per attendee:** explicit "I consent" checkbox (NOT pre-checked). Camera cannot activate until this is ticked AND the consent row is committed server-side.
- Per attendee card: nickname, enrollment status (derived from `biometric_vectors` existence), consent status badge, consent `granted_at` timestamp, policy version accepted, "Withdraw & Delete" action.
- **Access audit strip** per attendee: "Last match attempt: {timestamp}, Total matches: {n}" — sourced from `biometric_access_log` so the guest can see every time their template was used.

COMPONENTS:

- `BiometricConsentCard` — disclosure + legally-required checkbox + policy version
- `AttendeeEnrollmentCard` — per-attendee enrollment UI, gated by consent
- `FaceCaptureWidget` — camera-based face capture; activates only after consent committed
- `BiometricAccessLogStrip` — read-only audit visibility for the guest

DATA LOADING:

- `booking_attendees` WHERE booking_id, `biometric_vectors` WHERE attendee_id (existence check), `consent_records` WHERE subject_id = attendee_id AND consent_type = 'biometric_enrollment', latest 5 `biometric_access_log` rows per attendee
- Direct props

INTERACTIONS:

- **Grant consent** → Server Action (service_role, CSRF-validated) → INSERT `consent_records` (subject_id = attendee_id, subject_type = 'booking_attendee', consent_type = 'biometric_enrollment', legal_basis = 'explicit_consent', purpose = 'face_pay_and_autocapture', retention_policy = 'visit_end_plus_24h', policy_version, granted_at = NOW(), ip_address, user_agent). Idempotency key = `{attendee_id}:{consent_type}:{session_id}`. No row = no enrollment.
- **Enroll** (only after consent row exists for this attendee and is not withdrawn):
  - Camera capture (client) → POST image to Edge Function `enroll-biometric` (service_role).
  - Edge Function: (1) validate MIME + signature + size per global upload rules, (2) extract face vector in-memory, (3) discard raw image — raw biometric images MUST NOT persist to Storage, (4) INSERT `biometric_vectors` (attendee_id, vector_hash, enrolled_at, consent_record_id FK), (5) INSERT `biometric_access_log` (event = 'enroll', actor_type = 'guest_self', ip_address, user_agent).
  - Vector storage is envelope-encrypted via Supabase Vault / pgsodium.
- **Withdraw & Delete** → Server Action → `rpc_withdraw_biometric_consent(p_attendee_id)` performs atomically:
  1. UPDATE `consent_records` SET withdrawn_at = NOW(), withdrawal_method = 'guest_self_service'
  2. DELETE `biometric_vectors` WHERE attendee_id
  3. UPDATE `booking_attendees` SET face_pay_enabled = FALSE, auto_capture_enabled = FALSE
  4. INSERT `biometric_access_log` (event = 'withdraw_and_delete')
  - Completion is synchronous — the UI confirms deletion before returning.
- **Automatic retention deletion** — `cron-biometric-retention` (pg_cron, hourly): DELETE `biometric_vectors` WHERE the parent booking's latest slot `end_time + 24h < NOW()` AND no active (non-withdrawn, unexpired) consent covers the row. Each deletion emits `biometric_access_log` event = 'auto_delete_retention' for audit trail.
- **Every read** of a biometric vector (Face Pay gate at `/crew/pos`, auto-capture matcher in capture pipeline) MUST INSERT into `biometric_access_log` (event = 'match_attempt', actor_type = 'system' | 'staff', actor_id, match_result, confidence_score, ip_address). Reads without an audit log row are blocked by a trigger on the read-side RPC.
- **DSR erasure** — `rpc_erase_subject(p_booking_id)` (invoked from the privacy-request workflow outside this route): cascades deletion of `biometric_vectors`, anonymizes `consent_records` (retains hash + purpose + timestamps + policy version for the 7-year legal-proof retention BIPA requires), preserves `biometric_access_log` (immutable audit trail).
- **Consent re-solicitation** — if the privacy policy version bumps, prior consents auto-expire server-side; the guest sees the fresh disclosure and must re-consent before Face Pay works on the next visit.

DOMAIN GATING:

- Guest session cookie required. Guest CSRF token required on every mutation. Face Pay reads are additionally gated by `consent_records` not-withdrawn check.

TABLES TOUCHED:

- SELECT: `booking_attendees`, `biometric_vectors`, `consent_records`, `biometric_access_log`
- INSERT: `consent_records`, `biometric_vectors` (via Edge Function service_role), `biometric_access_log`
- UPDATE: `consent_records` (withdrawn_at), `booking_attendees` (face_pay_enabled, auto_capture_enabled)
- DELETE: `biometric_vectors` (on withdrawal or retention sweep)
- RPCs: `rpc_withdraw_biometric_consent(p_attendee_id)`, `rpc_erase_subject(p_booking_id)`
- Cron: `cron-biometric-retention` (hourly)

### `/my-booking/manage/memories`

WHO: Guest session cookie
PURPOSE: View and download auto-captured photos from the visit
WORKFLOW: WF-7B

LAYOUT:

- Photo gallery: `captured_photos` WHERE booking_id
- Per photo: thumbnail, captured_at, attendee name (if matched)
- Download individual, download all as ZIP, generate share URL

COMPONENTS:

- `PhotoGallery` — grid of captured photos
- `PhotoActions` — download/share controls

DATA LOADING:

- `captured_photos` WHERE booking_id LEFT JOIN `booking_attendees` (nickname)
- Dehydrated React Query

INTERACTIONS:

- Download individual: signed URL from Supabase Storage
- Download all: ZIP generation (client-side or Edge Function)
- Share: generate time-limited share URL

DOMAIN GATING:

- Guest session cookie required

TABLES TOUCHED:

- SELECT: `captured_photos`, `booking_attendees`

### 5c. Guest Survey

| Route     | Page Title        | Auth Method          | Data Tables / RPCs               | WF Ref |
| --------- | ----------------- | -------------------- | -------------------------------- | ------ |
| `/survey` | Post-Visit Survey | Anonymous (anon key) | `survey_responses` (INSERT only) | —      |

### `/survey`

WHO: Anonymous (anon key)
PURPOSE: Post-visit guest survey — feedback collection
WORKFLOW: —

LAYOUT:

- Survey form (single page)
- "How was your visit?" — overall_score (0-10 star/slider rating)
- "Would you recommend us?" — nps_score (0-10 scale)
- "What stood out?" — predefined topic checkboxes (Staff friendliness, Cleanliness, Wait times, Value for money, Food quality, Atmosphere — stored as `keywords` JSONB)
- "Tell us more" — free text (feedback_text)
- survey_type auto-populated from context (not shown to guest). source auto-populated from access method (in_app, qr_code, etc. — not shown to guest). sentiment derived from overall_score (0-6 = negative, 7 = neutral, 8-10 = positive — not a user input)
- Optional booking_ref link

COMPONENTS:

- `SurveyForm` — all survey fields

DATA LOADING:

- None

INTERACTIONS:

- Submit: Server Action → INSERT `survey_responses` (survey_type, overall_score CHECK 0-10, nps_score CHECK 0-10, sentiment: `positive` | `neutral` | `negative`, keywords JSONB, feedback_text, source: `in_app` | `email` | `kiosk` | `qr_code`, booking_id from optional booking_ref lookup)
- Anon INSERT allowed (RLS policy: `survey_responses_insert_anon`)

DOMAIN GATING:

- None — anonymous (anon INSERT policy)

TABLES TOUCHED:

- INSERT: `survey_responses`

---

## 6. Cross-Portal Shared Components

Components written once in `src/components/shared/`, wrapped per portal via thin 2-line route wrappers.

### Shared Component Wrapper Pattern

Each portal's `page.tsx` is a thin wrapper that imports the shared component and passes exactly the props needed to control portal-specific behavior. Three patterns emerge:

**Pattern A — No Props (identical behavior).** The wrapper passes nothing. The shared component reads its own data server-side.

**Pattern B — Mode Prop (same data, different UI capabilities).** The wrapper passes a `mode` literal that toggles UI affordances (e.g., create buttons, resolve actions). Data scoping is still enforced by RLS/RPCs server-side, not by the mode prop.

**Pattern C — Server-Injected Context (different data scope).** The RSC wrapper reads JWT claims server-side and passes the resolved filter set as props. The shared component never reads the JWT itself — it receives pre-computed, typed filter arrays.

---

#### 1. `SettingsPage` — Pattern A (no props)

```tsx
// Props interface
interface SettingsPageProps {} // none

// src/app/(portal)/admin/settings/page.tsx
// src/app/(portal)/management/settings/page.tsx
// src/app/(portal)/crew/settings/page.tsx
import { SettingsPage } from "@/components/shared/settings-page";
export default function Page() {
  return <SettingsPage />;
}
```

#### 2. `AttendancePage` — Pattern C (server-injected context) — **AMENDED BY ADR-0005**

> **Historical note:** originally specified as Pattern A (no props). Overridden by
> [ADR-0005](docs/adr/0005-attendance-pattern-c-override.md) to enable
> drill-down, hover previews, shareable deep-links, and future admin
> "view-as" UX. RLS unchanged — safety-neutral refactor. The shared
> component is split into a thin self-resolving wrapper (`AttendancePage`)
> plus a parametrized renderer (`StaffAttendanceView`).

```tsx
// Parametrized renderer — feature-local, reused by future admin drill-down.
// src/features/attendance/components/staff-attendance-view.tsx
interface StaffAttendanceViewProps {
  staffRecordId: string;
  displayName: string;
  canWrite?: boolean; // defaults true
  searchParams: Readonly<{ tab?: string; date?: string; month?: string }>;
  locale: string;
  density?: "default" | "compact"; // defaults "default"
}

// Thin wrapper — preserves the import surface for every /*/attendance route.
// src/components/shared/attendance-page.tsx
interface AttendancePageProps {
  locale: string;
  searchParams?: Readonly<{ tab?: string; date?: string; month?: string }>;
}

// Route wrappers unchanged:
// src/app/(portal)/admin/attendance/page.tsx
// src/app/(portal)/management/attendance/page.tsx
// src/app/(portal)/crew/attendance/page.tsx
import { AttendancePage } from "@/components/shared/attendance-page";
export default function Page(props) {
  return <AttendancePage {...props} />;
}
```

#### 3. `AnnouncementsPage` — Pattern B (mode prop)

```tsx
// Props interface
interface AnnouncementsPageProps {
  mode: "manage" | "read-only";
  // "manage": shows create/edit/target controls (comms:c/u/d enforced server-side)
  // "read-only": shows read + mark-as-read only (comms:r)
}

// src/app/(portal)/admin/announcements/page.tsx
import { AnnouncementsPage } from "@/components/shared/announcements-page";
export default function Page() {
  return <AnnouncementsPage mode="manage" />;
}

// src/app/(portal)/management/announcements/page.tsx
import { AnnouncementsPage } from "@/components/shared/announcements-page";
export default function Page() {
  return <AnnouncementsPage mode="manage" />;
}

// src/app/(portal)/crew/announcements/page.tsx
import { AnnouncementsPage } from "@/components/shared/announcements-page";
export default function Page() {
  return <AnnouncementsPage mode="read-only" />;
}
```

#### 4. `IncidentLogPage` — Pattern B (single `mode` prop; groups derived internally)

```tsx
// Props interface — single mode prop, no redundant visibleGroups
interface IncidentLogPageProps {
  mode: "ops" | "maintenance" | "crew";
  // "ops": full table with resolve action, KPI bar, ops category groups
  // "maintenance": full table with resolve action, KPI bar, maintenance category groups
  // "crew": report form (all categories) + view own incidents only
}

type IncidentGroupKey =
  | "safety"
  | "medical"
  | "security"
  | "guest"
  | "structural"
  | "equipment"
  | "other";

// Single source of truth, colocated with the shared component.
// visibleGroups is a PURE FUNCTION of mode — derived at runtime, never passed by wrappers.
const MODE_TO_GROUPS: Record<IncidentLogPageProps["mode"], IncidentGroupKey[]> = {
  ops: ["safety", "medical", "security", "guest", "other"],
  maintenance: ["structural", "equipment"],
  crew: ["safety", "medical", "security", "guest", "structural", "equipment", "other"],
};

// src/app/(portal)/management/operations/incidents/page.tsx
import { IncidentLogPage } from "@/components/shared/incident-log-page";
export default function Page() {
  return <IncidentLogPage mode="ops" />;
}

// src/app/(portal)/management/maintenance/incidents/page.tsx
import { IncidentLogPage } from "@/components/shared/incident-log-page";
export default function Page() {
  return <IncidentLogPage mode="maintenance" />;
}

// src/app/(portal)/crew/incidents/page.tsx
import { IncidentLogPage } from "@/components/shared/incident-log-page";
export default function Page() {
  return <IncidentLogPage mode="crew" />;
}
```

#### 5. `DomainReportsPage` — Pattern C (server-injected domain context)

```tsx
// Props interface
interface DomainReportsPageProps {
  allowedReportTypes: ReportType[];
  // Pre-resolved from JWT domains by the RSC wrapper. Component renders dropdown from this array.
  canSchedule: boolean;
  // true if user has reports:c — controls schedule UI visibility
}

// src/app/(portal)/admin/reports/page.tsx
import { DomainReportsPage } from "@/components/shared/domain-reports-page";
import { resolveAllowedReportTypes } from "@/features/reports/queries/resolve-report-types";
import { hasPermission } from "@/lib/auth/permissions";
export default async function Page() {
  const allowedReportTypes = await resolveAllowedReportTypes(); // reads JWT domains, admins get all 25
  const canSchedule = await hasPermission("reports:c");
  return <DomainReportsPage allowedReportTypes={allowedReportTypes} canSchedule={canSchedule} />;
}

// src/app/(portal)/management/reports/page.tsx
import { DomainReportsPage } from "@/components/shared/domain-reports-page";
import { resolveAllowedReportTypes } from "@/features/reports/queries/resolve-report-types";
import { hasPermission } from "@/lib/auth/permissions";
export default async function Page() {
  const allowedReportTypes = await resolveAllowedReportTypes(); // filters by manager's domains
  const canSchedule = await hasPermission("reports:c");
  return <DomainReportsPage allowedReportTypes={allowedReportTypes} canSchedule={canSchedule} />;
}
```

#### 6. `DomainAuditTable` — Pattern C (server-injected domain context)

```tsx
// Props interface
interface DomainAuditTableProps {
  allowedEntityTypes: EntityType[];
  // Pre-resolved from JWT domains by the RSC wrapper. Component filters query by this array.
}

// src/app/(portal)/admin/audit/page.tsx
import { DomainAuditTable } from "@/components/shared/domain-audit-table";
import { resolveAllowedEntityTypes } from "@/features/audit/queries/resolve-entity-types";
export default async function Page() {
  const allowedEntityTypes = await resolveAllowedEntityTypes(); // admin: all entity types
  return <DomainAuditTable allowedEntityTypes={allowedEntityTypes} />;
}

// src/app/(portal)/management/audit/page.tsx
import { DomainAuditTable } from "@/components/shared/domain-audit-table";
import { resolveAllowedEntityTypes } from "@/features/audit/queries/resolve-entity-types";
export default async function Page() {
  const allowedEntityTypes = await resolveAllowedEntityTypes(); // filtered by manager's domains
  return <DomainAuditTable allowedEntityTypes={allowedEntityTypes} />;
}
```

---

| Shared Component    | Route Paths                                                                                | Behavior Differences                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SettingsPage`      | `/admin/settings`, `/management/settings`, `/crew/settings`                                | Identical — edit own profile, avatar (`rpc_update_own_avatar`), theme toggle                                                                                                                               |
| `AnnouncementsPage` | `/admin/announcements`, `/management/announcements`, `/crew/announcements`                 | **Admin + Management (comms:c):** create, manage, target (global/role/org_unit/user). **Crew (comms:r):** read-only                                                                                        |
| `IncidentLogPage`   | `/management/operations/incidents`, `/management/maintenance/incidents`, `/crew/incidents` | **ops domain (ops:c):** safety, medical, security, guest, other categories (20). **maintenance domain with ops:r:** structural, equipment categories (7). **Crew:** report new (all categories) + view own |
| `DomainReportsPage` | `/admin/reports`, `/management/reports`                                                    | Report type dropdown filtered by user's domains. Admins see all 25 types                                                                                                                                   |
| `DomainAuditTable`  | `/admin/audit`, `/management/audit`                                                        | Admins see all entity_types. Managers see entity_types matching their domains                                                                                                                              |
| `AttendancePage`    | `/admin/attendance`, `/management/attendance`, `/crew/attendance`                          | Identical — all staff clock in/out, view own exceptions, review own attendance stats. 3-tab layout below.                                                                                                  |

### `SettingsPage`

WHO: All authenticated staff (no domain gating)
PURPOSE: Edit own profile information, avatar, and UI theme preference
WORKFLOW: —

LAYOUT:

- Profile section: display_name (editable), email (read-only from `profiles.email`), employee_id (read-only)
- Avatar section: current avatar, upload/change button
- Theme toggle: light/dark (persisted in localStorage), default: dark

COMPONENTS:

- `ProfileForm` — display_name edit
- `AvatarUploader` — image upload + crop
- `ThemeToggle` — light/dark switch

DATA LOADING:

- RSC fetches: `profiles` WHERE id = auth.uid() (own record only)
- Direct props

INTERACTIONS:

- Update display_name: Server Action → UPDATE `profiles` SET display_name → `revalidatePath`
- Update avatar: upload to Supabase Storage → `rpc_update_own_avatar(p_avatar_url)` → UPDATE `profiles` SET avatar_url → `revalidatePath`
- Theme: client-side localStorage, no server mutation

DOMAIN GATING:

- None — all authenticated users can edit own profile

TABLES TOUCHED:

- SELECT: `profiles`
- UPDATE: `profiles` (display_name, avatar_url via RPC)
- RPCs: `rpc_update_own_avatar(p_avatar_url)`

### `AnnouncementsPage`

WHO: `comms` domain with `r` access
PURPOSE: View, create, and manage targeted announcements across the organization
WORKFLOW: WF-16

LAYOUT:

- **Admin/Management view** (comms:c): status tabs — Published | Drafts. Create/Edit form: title, content, is_published toggle, expires_at, target audience
- **Crew view** (comms:r): tabs — Unread ({n}) | All. Read-only
- Default sort: unread pinned first, then created_at DESC
- Announcement cards: title, content preview, publish date, target scope, read/unread dot indicator

COMPONENTS:

- `AnnouncementList` — announcement cards with read/unread dot
- `AnnouncementForm` — create/edit with target audience picker
- `TargetAudiencePicker` — target_type (`global` | `role` | `org_unit` | `user`) + corresponding selector (role_id dropdown, org_unit_id tree, user_id search)
- `UnreadBadge` — topbar badge count

DATA LOADING:

- RSC fetches: announcements via `get_visible_announcements(p_unread_only := FALSE)` (SECURITY DEFINER RPC — matches targets via global, role_id, org_unit ltree ancestry, or direct user_id)
- `announcement_reads` WHERE user_id = auth.uid() (for read/unread state)
- Dehydrated React Query

INTERACTIONS:

- **Create** (comms:c): fields — title, content, is_published, expires_at → Server Action → INSERT `announcements` + INSERT `announcement_targets` per target (target_type + role_id/org_unit_id/user_id per CHECK constraint) → `revalidatePath`
- **Edit** (comms:u): Server Action → UPDATE `announcements` → `revalidatePath`
- **Mark as read**: on expand → INSERT `announcement_reads` (announcement_id, user_id) ON CONFLICT DO NOTHING
- **Mark all as read**: batch INSERT `announcement_reads` for all visible unread
- **Unread badge**: COUNT of visible announcements (last 30 days) WITHOUT matching `announcement_reads` row
- **Crew (comms:r)**: read-only — no create/edit/target controls visible

DOMAIN GATING:

- View: `comms:r`. Create/edit/target: `comms:c`/`comms:u`. Delete: `comms:d`
- Announcement visibility resolved by `get_visible_announcements()` RPC, not frontend filtering

TABLES TOUCHED:

- SELECT: `announcements`, `announcement_targets`, `announcement_reads` (via RPC)
- INSERT: `announcements`, `announcement_targets`, `announcement_reads`
- UPDATE: `announcements`
- RPCs: `get_visible_announcements(p_unread_only)`

### `IncidentLogPage`

WHO: Varies by portal — `ops:c` (operations), `ops:r` (maintenance), all crew (report)
PURPOSE: Report new incidents and view/resolve existing ones, filtered by incident category groups
WORKFLOW: WF-14

LAYOUT:

- KPI bar (for ops/maintenance view): open incident counts by category group (safety: {n}, medical: {n}, etc.)
- Status tabs (nuqs `?status=open`): Open ({n}, default) | Resolved
- Within each tab: category group filter (dropdown)
- Default sort: open = created_at DESC (newest incident first to triage); resolved = resolved_at DESC
- Create form: two-step grouped category dropdown + description + zone + attachment
- Columns: category badge, zone name, description preview, reported by, created_at (humanized), time open (for open tab)

COMPONENTS:

- `IncidentTable` — filterable data table
- `IncidentReportForm` — create form with grouped category picker
- `ResolveAction` — resolve button with confirmation

DATA LOADING:

- RSC fetches: `incidents` LEFT JOIN `zones` (name) LEFT JOIN `profiles` AS resolved_by (display_name)
- Dehydrated React Query

INTERACTIONS:

- **Report** (all crew — Tier 2 universal insert): two-step category selection (group first, then specific `incident_category` ENUM value from that group) + description (required) + zone_id (select from `zones`) + attachment_url (file upload) → Server Action → INSERT `incidents` (status = 'open') → `revalidatePath`
- **Resolve** (ops:u — managers only): resolution dialog with notes field (stored in `incidents.metadata` JSONB as `{"resolution_notes": "..."}`) → Server Action → UPDATE `incidents` SET status = 'resolved', resolved_by = auth.uid(), resolved_at = NOW(), metadata = metadata || resolution_notes → `revalidatePath`

DOMAIN GATING:

- **Operations view** (ops:c): sees safety + medical + security + guest + other groups (20 categories from `incident_category` ENUM: fire, safety_hazard, biohazard, suspicious_package, spill, medical_emergency, heat_exhaustion, guest_injury, theft, vandalism, unauthorized_access, altercation, guest_complaint, lost_child, found_child, crowd_congestion, lost_property, found_property, other)
- **Maintenance view** (maintenance domain with ops:r): sees structural + equipment groups (7 categories: structural, prop_damage, equipment_failure, pos_failure, hardware_failure, power_outage, network_outage)
- **Crew report form**: all 7 groups, all 27 categories. View limited to own reported incidents (created_by = auth.uid())
- Category filtering enforced at component level, not RLS (incidents RLS is Tier 2 universal read)

```
INCIDENT_GROUPS = {
  safety:     [fire, safety_hazard, biohazard, suspicious_package, spill]
  medical:    [medical_emergency, heat_exhaustion, guest_injury]
  security:   [theft, vandalism, unauthorized_access, altercation]
  guest:      [guest_complaint, lost_child, found_child, crowd_congestion, lost_property, found_property]
  structural: [structural, prop_damage]
  equipment:  [equipment_failure, pos_failure, hardware_failure, power_outage, network_outage]
  other:      [other]
}
```

TABLES TOUCHED:

- SELECT: `incidents`, `zones`, `profiles`
- INSERT: `incidents`
- UPDATE: `incidents` (status, resolved_by, resolved_at)

### `DomainReportsPage`

WHO: `reports` domain with `r` access
PURPOSE: Generate, schedule, and download reports — type dropdown filtered by user's domains
WORKFLOW: WF-18

LAYOUT:

- Report type selector (filtered by user's domains — see domain-to-report mapping below)
- Parameters panel: date_range (today/7d/30d/custom) + context-sensitive filters shown only when relevant to the selected report type (e.g., daily_sales shows pos_point_id; leave_balance shows no extra filters; stock_level shows location_id)
- Scheduled reports section: cron expression, recipients, pause/resume
- Report history: `report_executions` with status and download link

COMPONENTS:

- `ReportTypeSelector` — domain-filtered dropdown
- `ReportParameterForm` — date range + context filters
- `ScheduledReportManager` — cron config + recipients
- `ReportHistoryTable` — execution history with download links

DATA LOADING:

- RSC fetches: `reports` WHERE created_by = auth.uid() or shared, `report_executions` JOIN `reports`
- User domains read from JWT to filter available report types
- Dehydrated React Query

INTERACTIONS:

- **Generate**: select report*type + parameters → Server Action → INSERT/UPDATE `reports` (report_type, parameters) → invoke Edge Function `generate-report` (report_id) → Edge Function (service_role): INSERT `report_executions` (status = 'processing') → calls `execute_report(p_report_type, p_params)` → PL/pgSQL dispatcher → `\_report*\*`sub-function → CSV → Storage → signed URL → UPDATE`report_executions`(status = 'completed', file_url) →`revalidatePath`
- **Schedule**: fields — schedule_cron (cron expression), recipients (JSONB array of emails), is_active toggle → Server Action → UPDATE `reports` → `revalidatePath`
- **Download**: click file_url → signed URL download

Report types by domain:

- `hr`: monthly_attendance_summary, monthly_timesheet, leave_balance, leave_usage, staff_roster, exception_report
- `pos`: daily_sales, sales_by_item, sales_by_category, sales_by_payment_method, hourly_sales
- `procurement`: purchase_order_summary
- `inventory` / `inventory_ops`: stock_level, low_stock_alert, waste_report, inventory_movement, reconciliation_report
- `booking` + `ops`: booking_summary, booking_occupancy, revenue_by_experience, incident_summary, vehicle_status
- `marketing`: guest_satisfaction, nps_summary
- `maintenance`: maintenance_summary
- Admins (all domains): all 25 report types

DOMAIN GATING:

- View/generate: `reports:r`. Schedule: `reports:c`/`reports:u`
- Report type list filtered by user's domain set from JWT

TABLES TOUCHED:

- SELECT: `reports`, `report_executions`
- INSERT: `reports`, `report_executions` (via Edge Function)
- UPDATE: `reports`, `report_executions` (via Edge Function)

### `DomainAuditTable`

WHO: `reports` domain with `r` access
PURPOSE: View system audit log filtered by entity types matching user's domains
WORKFLOW: —

LAYOUT:

- Data table of `system_audit_log`
- Default sort: created_at DESC (newest first)
- Columns: action (Created/Updated/Deleted), record type (human-readable from entity_type, e.g., "Staff Record" not "staff_records"), record link (entity_id linked to actual record), changed by (display_name from performed_by), date/time
- Expandable row detail: field-level change table (Field | Old Value | New Value) parsed from old_values/new_values JSONB with humanized column names
- Filters: record type (filtered by domain), action, date range, search by person

COMPONENTS:

- `AuditLogTable` — filterable data table with JSONB diff display

DATA LOADING:

- RSC fetches: `system_audit_log` filtered by entity_type based on user's domains from JWT
- Cursor-based pagination (keyset on `system_audit_log.created_at` DESC, `system_audit_log.id`). Mandatory — this is the largest table in the database.
- Admin view: unfiltered (all entity_types)
- Manager view: entity_types matching their domains:
  - `hr`: staff_records, profiles, iam_requests, leave_requests, leave_ledger, timecard_punches, attendance_exceptions, shift_schedules
  - `pos`: material_sales_data, orders, bom_components, order_items, pos_points
  - `procurement`: purchase_orders, suppliers, material_procurement_data
  - `inventory` + `inventory_ops`: materials, stock_balance_cache, purchase_orders, goods_movements, write_offs
  - `ops`: incidents, maintenance_orders, vehicles, time_slots, experiences
  - `marketing`: promo_codes, campaigns
  - `maintenance`: incidents, maintenance_orders, devices
- Dehydrated React Query

INTERACTIONS:

- No mutations — read-only audit log (immutable, no UPDATE/DELETE policies)
- Expand row to view full JSONB old_values/new_values diff

DOMAIN GATING:

- Requires `reports:r`. Entity type filter applied at query level based on domains from JWT

TABLES TOUCHED:

- SELECT: `system_audit_log`, `profiles` (for performed_by display_name)

### `AttendancePage`

WHO: All authenticated staff (requires `hr:c` for clock actions, `hr:r` for view)
PURPOSE: Clock in/out, view own attendance exceptions, review monthly attendance stats
WORKFLOW: WF-5

LAYOUT:

- 3-tab layout (nuqs `?tab=clock|exceptions|stats`)
- **Tab 1: "Clock In/Out"** (default) — shift display + clock actions
- **Tab 2: "My Exceptions"** — own exception list with clarification
- **Tab 3: "My Attendance"** — monthly stats summary

COMPONENTS:

- `ClockInOutPanel` — shift card + GPS + selfie capture + clock buttons
- `ExceptionList` — own exceptions with clarification input
- `AttendanceStatsPanel` — monthly KPIs + weekly breakdown

DATA LOADING:

- Tab 1: `shift_schedules` WHERE staff_record_id = own AND shift_date = selected_date JOIN `shift_types` (for grace periods, clock windows), `timecard_punches` WHERE shift_schedule_id (for button state)
- Tab 2: `attendance_exceptions` WHERE staff_record_id = own JOIN `shift_schedules` JOIN `shift_types`
- Tab 3: `v_shift_attendance` WHERE staff_record_id = own AND shift_date in selected month
- Dehydrated React Query

INTERACTIONS:

- **Tab 1 — Clock In/Out:**
  - Date picker at top (defaults today). Previous dates: read-only history. Actions only for today
  - No shift for selected date → "No Shift Assigned Today", disable actions
  - GPS acquisition on mount: `navigator.geolocation.getCurrentPosition()` → JSONB `{lat, lng, accuracy}`
  - Clock-in: front camera selfie capture → confirm → Server Action → `rpc_clock_in(p_gps, p_selfie_url, p_remark, p_source)` (source default `mobile`) → triggers: `trg_validate_punch_window` (rejects if outside allowed window: before `shift_start - max_early_clock_in_minutes` or after `shift_start + max_late_clock_in_minutes`), `trg_detect_discrepancies` (flags `late_arrival` if past grace period) → `revalidatePath`
  - Clock-out: same selfie + GPS → Server Action → `rpc_clock_out(p_gps, p_selfie_url, p_remark, p_source)` → triggers: `trg_validate_punch_window` (rejects if after `shift_end + max_late_clock_out_minutes`), `trg_detect_discrepancies` (flags `early_departure` or `missing_clock_in`) → `revalidatePath`. Does NOT require prior clock-in (standalone allowed)
  - Undo Punch: Users can void their own punches within a 1-hour grace window to correct accidental captures via the `void-own-punch` action (`rpc_void_own_punch(p_punch_id)`).
  - Button logic: before `(expected_start_time + shift_types.max_late_clock_in_minutes)` → show Clock In. After cutoff or already clocked in → show Clock Out. After both → "Shift Complete"

- **Tab 2 — My Exceptions (AMENDED BY [ADR-0007](docs/adr/0007-exception-clarification-workflow.md)):**
  - Columns: shift_date, shift_type name, issue type, status (Needs Review | Awaiting HR | Approved | Rejected), punch_remark (read-only from `timecard_punches.remark`), staff note + HR note preview
  - Four-state affordance per row:
    - `unjustified` → "Request HR review" editor in the detail sheet: `staff_clarification` textarea + attachment uploader (MC, receipts, photos — up to 5 files × 10 MB each; JPEG/PNG/WebP/HEIC/PDF). Submit → Server Action → `rpc_submit_exception_clarification(p_exception_id, p_text, p_attachment_paths)` → status transitions to `pending_review` → surgical `revalidatePath`.
    - `pending_review` → read-only: submitted note, attachment list, "Awaiting HR review" badge.
    - `justified` → read-only: HR note (approval reason or "Converted to \<leave_type\>").
    - `rejected` → read-only HR rejection note + "Edit & resubmit" editor (pre-fills prior text) → resubmit loops back to `pending_review`.
  - Attachments upload first to the `attendance-clarifications` bucket (path `{staff_record_id}/{exception_id}/{uuid}.{ext}`; RLS pins the first segment to the caller's own staff_record_id), then the RPC links them atomically via `attendance_clarification_attachments` (append-only — no delete).
  - Banner: "{n} exceptions need your attention" (combined count of `unjustified` + `rejected` — both require the staff member to act).
  - Punch note (`timecard_punches.remark`) remains a distinct surface — a quick note captured at clock-in/out time, reference-only, never escalates.
  - Default sort: action-required first (`unjustified`, `rejected`) → `pending_review` → `justified` last. Within each bucket newest-first. No create/delete — rows are system-generated by triggers + cron.

- **Tab 3 — My Attendance:**
  - Month picker (current month default, navigate month by month)
  - Stats from `v_shift_attendance` WHERE shift_date BETWEEN month_start AND month_end (month range passed as query parameter to React Query fetcher — do NOT query the full view unscoped):
    - Days worked (COUNT derived_status = 'completed')
    - Days absent (COUNT derived_status = 'absent')
    - Days on leave (COUNT derived_status = 'on_leave')
    - Total net hours (SUM net_worked_seconds / 3600)
    - Total late minutes (SUM positive deltas: first_in - expected_start_time)
    - Total early departure minutes (SUM positive deltas: expected_end_time - last_out)
    - Justified exception count
    - Unjustified exception count
  - Weekly breakdown table below summary KPIs

DOMAIN GATING:

- Clock actions: `hr:c`. View: `hr:r`. All data scoped to own staff_record_id (Tier 4 RLS)

TABLES TOUCHED:

- SELECT: `shift_schedules`, `shift_types`, `timecard_punches`, `attendance_exceptions`, `v_shift_attendance`
- INSERT: `timecard_punches` (via RPC)
- UPDATE: `attendance_exceptions` (staff_clarification via RPC)
- RPCs: `rpc_clock_in(p_gps, p_selfie_url, p_remark, p_source)`, `rpc_clock_out(p_gps, p_selfie_url, p_remark, p_source)`, `rpc_add_exception_clarification(p_exception_id, p_text)`

---

## 7. Middleware Decision Tree

Domain-based — zero role-string checks.

```
Request arrives
  |
  +-- Guest path? (/book, /my-booking/*, /survey)
  |     |
  |     +-- /my-booking/manage/* --> Check guest session cookie
  |     |     valid? --> proceed
  |     |     invalid? --> redirect /my-booking
  |     |
  |     +-- All other guest paths --> pass through (anon access)
  |
  +-- Auth path? (/auth/*) --> pass through
  |
  +-- Static assets? (/_next/*, /favicon.ico) --> pass through
  |
  +-- Staff portal? (/admin/*, /management/*, /crew/*)
        |
        +-- Gate 1: No session --> redirect /auth/login
        |
        +-- Gate 2: password_set === false --> redirect /auth/set-password
        |
        +-- Gate 3: employment_status check
        |     'pending'    --> redirect /auth/not-started
        |     'suspended'  --> redirect /auth/access-revoked
        |     'terminated' --> redirect /auth/access-revoked
        |     'on_leave'   --> SET x-agartha-readonly header, allow access
        |     'active'     --> continue
        |
        +-- Gate 4: Portal-access_level alignment
        |     /admin/*       requires access_level = 'admin'
        |     /management/*  requires access_level IN ('admin', 'manager')
        |     /crew/*        requires access_level IN ('admin', 'manager', 'crew')
        |
        |     Mismatch --> redirect to correct portal:
        |       admin trying /crew/* --> redirect /admin
        |       crew trying /admin/* --> redirect /crew/attendance
        |
        +-- Gate 5: Domain-presence check (route-level RBAC at the edge)
        |     Each portal route in a middleware-side manifest (generated from the sidebar config)
        |     declares `requiredDomain: { domain: string, access: 'c'|'r'|'u'|'d' }`.
        |     JWT `domains` claim missing the required domain --> 403 redirect to portal landing
        |     with flash toast: "You do not have access to this page."
        |     Shared routes (/settings, /attendance, /announcements) bypass this gate — domain
        |     filtering happens at page level or via RLS only.
        |     Rationale: blocks unauthorized users at the edge before any DB call, eliminates
        |     empty-state leakage, and shrinks the attack surface for permission-boundary probing.
        |
        +-- Gate 6: MFA enforcement
        |     access_level = 'admin' AND JWT `mfa_verified` absent or older than 24h
        |       --> redirect /auth/mfa-challenge
        |
        +-- Proceed to page render
```

**View-Only Mode (on_leave):**

- Middleware sets `x-agartha-readonly: true` response header.
- Frontend reads flag -> disables all mutation controls (submit buttons, create forms, delete actions).
- Server actions validate: if `employment_status = 'on_leave'`, reject mutations with `FORBIDDEN_ON_LEAVE`.
- User can browse dashboards, view schedules, read announcements, check balances.

**JWT Claims Freshness (`is_claims_fresh`):**

- When an admin changes a user's role/status/permissions, `profiles.last_permission_update` is stamped.
- When the caller's JWT was issued before that timestamp, RPCs and Server Actions MUST return the explicit discriminated-union error `{ success: false, error: 'STALE_JWT' }` via a dedicated check at the top of every security-sensitive RPC (`IF NOT public.is_claims_fresh() THEN RAISE EXCEPTION 'STALE_JWT'; END IF;`).
- Empty result sets are **NOT** treated as stale tokens — empty is a legitimate, common state and MUST NOT trigger a session refresh.
- Frontend installs a single global Server Action response interceptor. Behavior:
  - On `error = 'STALE_JWT'` only: call `supabase.auth.refreshSession()` → retry the action once → on success, invalidate affected `revalidateTag` keys and display toast "Your permissions were updated. Refreshing session..." → on retry failure, redirect to `/auth/access-revoked`.
  - On any other error code (`FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`, etc.) or on empty data: DO NOT refresh the session. Surface the error per its taxonomy.
- React Query `onError` MUST NOT refresh the session on generic errors or empty data. Auto-refresh is triggered exclusively by the `STALE_JWT` discriminator, nowhere else.

---

## 8. Sidebar Configuration Reference

### 8a. Admin Sidebar

Ordered: dashboard first, daily operational tasks, then infrequent configuration, shared items last.

```
-- IT Admin (it:c, system:c)
Dashboard            /admin/it            it:c
IAM Ledger           /admin/iam           hr:c
Device Registry      /admin/devices       it:c
System Health        /admin/system-health it:c
---
Zones & Locations    /admin/zones         system:c
Org Unit Hierarchy   /admin/org-units     system:c
Permissions          /admin/permissions   system:c
Units of Measure     /admin/units         system:c
---
Reports              /admin/reports       reports:r
Audit Log            /admin/audit         reports:r
Announcements        /admin/announcements comms:r
Attendance           /admin/attendance    hr:c
Settings             /admin/settings      (always visible)

-- Business Admin (booking:r, reports:r — no it:c)
Dashboard            /admin/business      booking:r
Revenue & Sales      /admin/revenue       booking:r
Operations           /admin/operations    ops:r
Cost & Waste         /admin/costs         inventory:r
Guest Satisfaction   /admin/guests        reports:r
Workforce            /admin/workforce     hr:r
---
Reports              /admin/reports       reports:r
Audit Log            /admin/audit         reports:r
Announcements        /admin/announcements comms:r
Attendance           /admin/attendance    hr:c
Settings             /admin/settings      (always visible)
```

### 8b. Management Sidebar

Each manager typically sees 1-2 domain sections based on their role's domains. Ordered by operational frequency (daily-action domains first), shared items last. Order matters less here than in crew — desktop sidebar shows all items without truncation.

```
-- Domain sections (visible when user has domain:c)
-- Items with sub-routes are collapsible parents (click expands, no landing page).
-- Items without sub-routes (HR, POS, Procurement, Inventory) link directly to their landing page.
HR                   /management/hr                     hr:c
POS                  /management/pos                    pos:c
Operations           (expand only)                      ops:c
Inventory            /management/inventory              inventory:c
Procurement          /management/procurement            procurement:c
Maintenance          (expand only)                      maintenance:c
Marketing            (expand only)                      marketing:c

-- Shared (visible when user has domain:r)
Reports              /management/reports                reports:r
Audit Log            /management/audit                  reports:r
Announcements        /management/announcements          comms:r
Attendance           /management/attendance             hr:c
Settings             /management/settings               (always visible)
```

**Sub-route expansion example (Operations):**

```
Operations
  +-- Incidents       /management/operations/incidents     ops:c
  +-- Zone Telemetry  /management/operations/telemetry     ops:r
  +-- Experiences     /management/operations/experiences   booking:c  (different domain!)
  +-- Scheduler       /management/operations/scheduler     booking:c  (different domain!)
  +-- Vehicles        /management/operations/vehicles      ops:c
```

### 8c. Crew Sidebar (Bottom Navigation on Mobile)

Role-specific items render FIRST so the primary job action lands in the visible mobile bottom tab bar (max 4 + "More"). A fnb_crew member sees "POS Terminal | Active Orders | Attendance | Schedule" — not "Attendance | Schedule | Leave | Incidents | More > POS Terminal".

```
-- Role-specific (conditional on domain — rendered FIRST in bottom nav)
POS Terminal         /crew/pos                          pos:c
Active Orders        /crew/active-orders                pos:r
Entry Validation     /crew/entry-validation             booking:r
Restock              /crew/restock                      inventory_ops:c
Logistics            /crew/logistics/*                  inventory_ops:c OR procurement:u
Waste Declaration    /crew/disposals                    inventory_ops:c
Work Orders          /crew/maintenance/orders           maintenance:c

-- Shared (all crew — after role-specific items)
Attendance           /crew/attendance                   hr:c
Schedule             /crew/schedule                     hr:r
Leave                /crew/leave                        hr:c
Incidents            /crew/incidents                    ops:c
Zone Scan            /crew/zone-scan                    (always)
Guest Feedback       /crew/feedback                     (always)
Announcements        /crew/announcements                comms:r
Settings             /crew/settings                     (always)
```

Bottom tab bar examples by role (first 4 visible + "More"):

- **fnb_crew** (pos:c): POS Terminal, Active Orders, Attendance, Schedule | More
- **service_crew** (booking:r): Entry Validation, Attendance, Schedule, Leave | More
- **runner_crew** (inventory_ops:c, procurement:u): Restock, Logistics, Attendance, Schedule | More
- **security_crew** (ops:c): Incidents, Zone Scan, Attendance, Schedule | More
- **internal_maintenance_crew** (maintenance:c): Work Orders, Attendance, Schedule, Leave | More
- **cleaning_crew** (inventory_ops:c): Restock, Waste Declaration, Attendance, Schedule | More

---

## 9. RPC Invocation Reference

| RPC                               | Called From                                 | Domain Guard                        | WF    |
| --------------------------------- | ------------------------------------------- | ----------------------------------- | ----- |
| `rpc_get_available_slots`         | `/book`                                     | anon, authenticated                 | WF-7A |
| `rpc_validate_promo_code`         | `/book`                                     | anon, authenticated                 | WF-7A |
| `rpc_create_booking`              | `/book`                                     | authenticated (anon excluded)       | WF-7A |
| `rpc_get_booking_identity`        | `/my-booking`                               | anon, authenticated                 | WF-7B |
| `rpc_verify_otp`                  | `/my-booking/verify`                        | anon, authenticated                 | WF-7B |
| `rpc_get_booking_by_ref`          | `/my-booking/manage`                        | authenticated                       | WF-7B |
| `rpc_modify_booking`              | `/my-booking/manage`                        | authenticated                       | WF-7B |
| `rpc_lookup_booking`              | `/crew/entry-validation`                    | authenticated                       | WF-7B |
| `rpc_search_bookings_by_email`    | `/crew/entry-validation`                    | authenticated                       | WF-7B |
| `rpc_checkin_booking`             | `/crew/entry-validation`                    | authenticated                       | WF-7B |
| `rpc_preview_slot_override`       | `/management/operations/scheduler`          | booking:u                           | WF-8  |
| `rpc_confirm_slot_override`       | `/management/operations/scheduler`          | booking:u                           | WF-8  |
| `rpc_generate_time_slots`         | `/management/operations/experiences`        | booking:c                           | WF-7A |
| `rpc_wipe_biometric_data`         | CLI/API only (no UI route)                  | system:d                            | —     |
| `rpc_confirm_password_set`        | `/auth/set-password`                        | authenticated                       | WF-0  |
| `rpc_update_own_avatar`           | `*/settings`                                | authenticated                       | —     |
| `rpc_clock_in`                    | `/crew/attendance`                          | authenticated                       | WF-5  |
| `rpc_clock_out`                   | `/crew/attendance`                          | authenticated                       | WF-5  |
| `rpc_add_exception_clarification` | `/crew/attendance` (My Exceptions tab)      | authenticated (own exceptions only) | WF-5  |
| `rpc_convert_exception_to_leave`  | `/management/hr/attendance/queue`           | hr:u                                | WF-5  |
| `rpc_cancel_leave_request`        | `/crew/leave`                               | authenticated                       | WF-4  |
| `rpc_generate_schedules`          | cron (daily 22:00 MYT)                      | —                                   | WF-6  |
| `rpc_preview_pattern_change`      | `/management/hr/shifts`                     | hr:u                                | WF-6  |
| `rpc_apply_pattern_change`        | `/management/hr/shifts`                     | hr:u                                | WF-6  |
| `rpc_mark_day_off`                | `/management/hr/shifts`                     | hr:c                                | WF-6  |
| `submit_pos_order`                | `/crew/pos`                                 | pos:c                               | WF-13 |
| `rpc_reorder_dashboard`           | `/management/procurement/reorder`           | authenticated                       | WF-9  |
| `rpc_request_recount`             | `/management/inventory/reconciliation/[id]` | authenticated                       | WF-11 |
| `admin_lock_account`              | `/admin/iam`                                | system:d                            | WF-3  |
| `get_visible_announcements`       | `*/announcements`                           | authenticated                       | WF-16 |
| `rpc_run_monthly_accruals`        | cron (1st of month 00:30 MYT)               | —                                   | WF-4  |
| `get_active_vendors_for_radius`   | RADIUS infrastructure (no UI route)         | authenticated                       | WF-15 |

---

## 10. Workflow-to-Route Traceability Matrix

Every workflow step must map to a route. Missing mappings are flagged.

| WF    | Workflow                                  | Primary Routes                                                                                               |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| WF-0  | Staff Authentication & Portal Routing     | `/auth/*`, middleware                                                                                        |
| WF-1  | Staff Provisioning                        | `/management/hr` (create), `/admin/iam` (approve)                                                            |
| WF-2  | Staff Transfer                            | `/management/hr` (create), `/admin/iam` (approve)                                                            |
| WF-3  | Staff Termination/Suspension/Reactivation | `/management/hr` (create), `/admin/iam` (approve)                                                            |
| WF-4  | Leave Request Lifecycle                   | `/crew/leave` (create/cancel), `/management/hr/attendance/leaves` (approve/reject)                           |
| WF-5  | Attendance & Discrepancy                  | `/crew/attendance` (clock), `/management/hr/attendance/queue` (justify)                                      |
| WF-6  | Shift Scheduling                          | `/management/hr/shifts` (all 3 tabs)                                                                         |
| WF-7A | Guest Booking                             | `/book`, `/book/payment`                                                                                     |
| WF-7B | Manage Booking                            | `/my-booking/*`, `/crew/entry-validation`                                                                    |
| WF-8  | Slot Override & Cascade                   | `/management/operations/scheduler`                                                                           |
| WF-9  | Purchase Order Lifecycle                  | `/management/procurement/purchase-orders`, `/management/procurement/reorder`, `/crew/logistics/po-receiving` |
| WF-10 | Material Requisition                      | `/crew/restock`, `/management/inventory/requisitions`, `/crew/logistics/restock-queue`                       |
| WF-11 | Stock Reconciliation                      | `/management/inventory/reconciliation`, `/crew/logistics/stock-count`                                        |
| WF-12 | Inventory Disposal                        | `/crew/disposals`, `/management/inventory/write-offs`                                                        |
| WF-13 | POS Order & Stock Deduction               | `/crew/pos`, `/crew/active-orders`, `/management/pos/orders`                                                 |
| WF-14 | Incident Lifecycle                        | `/crew/incidents`, `/management/operations/incidents`, `/management/maintenance/incidents`                   |
| WF-15 | Maintenance Work Orders                   | `/management/maintenance/orders`, `/management/maintenance/vendors`, `/crew/maintenance/orders`              |
| WF-16 | Announcements                             | `*/announcements` (all 3 portals)                                                                            |
| WF-17 | Zone Telemetry & Crew Declaration         | `/crew/zone-scan`, `/management/operations/telemetry`                                                        |
| WF-18 | Report Generation                         | `*/reports` (admin + management)                                                                             |
| WF-19 | Permission Management                     | `/admin/permissions`, `/admin/org-units`                                                                     |
| WF-20 | Equipment Custody                         | `/management/inventory/equipment`, `/management/hr/[id]` (equipment tab)                                     |
| WF-21 | Guest Feedback Capture                    | `/crew/feedback` (submit), `/management/marketing/surveys` (Staff Feedback tab)                              |

**No missing routes detected.** All workflow steps have corresponding UI routes.

---

## 11. Route Count Summary

| Section                  | Route Count |
| ------------------------ | ----------- |
| Auth                     | 5           |
| Admin — IT               | 10          |
| Admin — Business         | 6           |
| Admin — Shared           | 5           |
| Management — POS         | 8           |
| Management — Procurement | 7           |
| Management — HR          | 6           |
| Management — Inventory   | 11          |
| Management — Operations  | 5           |
| Management — Marketing   | 3           |
| Management — Maintenance | 4           |
| Management — Shared      | 6           |
| Crew — Shared            | 8           |
| Crew — Role-Specific     | 9           |
| Guest — Booking          | 2           |
| Guest — Management       | 5           |
| Guest — Survey           | 1           |
| **Total**                | **101**     |

---

## 12. Route-to-File Mapping

### 12a. Auth Routes (5 routes)

| Route                  | File Path                                     | Feature Module       |
| ---------------------- | --------------------------------------------- | -------------------- |
| `/auth/login`          | `src/app/(auth)/auth/login/page.tsx`          | `src/features/auth/` |
| `/auth/set-password`   | `src/app/(auth)/auth/set-password/page.tsx`   | `src/features/auth/` |
| `/auth/not-started`    | `src/app/(auth)/auth/not-started/page.tsx`    | `src/features/auth/` |
| `/auth/access-revoked` | `src/app/(auth)/auth/access-revoked/page.tsx` | `src/features/auth/` |
| `/auth/on-leave`       | `src/app/(auth)/auth/on-leave/page.tsx`       | `src/features/auth/` |

### 12b. Admin Portal — IT Admin Routes (10 routes)

| Route                  | File Path                                      | Feature Module              |
| ---------------------- | ---------------------------------------------- | --------------------------- |
| `/admin/it`            | `src/app/(admin)/admin/it/page.tsx`            | `src/features/dashboard/`   |
| `/admin/iam`           | `src/app/(admin)/admin/iam/page.tsx`           | `src/features/iam/`         |
| `/admin/iam/[id]`      | `src/app/(admin)/admin/iam/[id]/page.tsx`      | `src/features/iam/`         |
| `/admin/devices`       | `src/app/(admin)/admin/devices/page.tsx`       | `src/features/devices/`     |
| `/admin/devices/[id]`  | `src/app/(admin)/admin/devices/[id]/page.tsx`  | `src/features/devices/`     |
| `/admin/zones`         | `src/app/(admin)/admin/zones/page.tsx`         | `src/features/zones/`       |
| `/admin/org-units`     | `src/app/(admin)/admin/org-units/page.tsx`     | `src/features/org-units/`   |
| `/admin/permissions`   | `src/app/(admin)/admin/permissions/page.tsx`   | `src/features/permissions/` |
| `/admin/system-health` | `src/app/(admin)/admin/system-health/page.tsx` | `src/features/devices/`     |
| `/admin/units`         | `src/app/(admin)/admin/units/page.tsx`         | `src/features/units/`       |

### 12c. Admin Portal — Business Admin Routes (6 routes)

| Route                        | File Path                                               | Feature Module            |
| ---------------------------- | ------------------------------------------------------- | ------------------------- |
| `/admin/business`            | `src/app/(admin)/admin/business/page.tsx`               | `src/features/dashboard/` |
| `/admin` (redirect, no page) | middleware rule in `middleware.ts` — no `page.tsx` file | —                         |
| `/admin/revenue`             | `src/app/(admin)/admin/revenue/page.tsx`                | `src/features/analytics/` |
| `/admin/operations`          | `src/app/(admin)/admin/operations/page.tsx`             | `src/features/analytics/` |
| `/admin/costs`               | `src/app/(admin)/admin/costs/page.tsx`                  | `src/features/analytics/` |
| `/admin/guests`              | `src/app/(admin)/admin/guests/page.tsx`                 | `src/features/analytics/` |
| `/admin/workforce`           | `src/app/(admin)/admin/workforce/page.tsx`              | `src/features/analytics/` |

### 12d. Admin Portal — Shared Routes (5 routes)

| Route                  | File Path                                      | Feature Module                |
| ---------------------- | ---------------------------------------------- | ----------------------------- |
| `/admin/reports`       | `src/app/(admin)/admin/reports/page.tsx`       | `src/features/reports/`       |
| `/admin/audit`         | `src/app/(admin)/admin/audit/page.tsx`         | `src/features/audit/`         |
| `/admin/announcements` | `src/app/(admin)/admin/announcements/page.tsx` | `src/features/announcements/` |
| `/admin/attendance`    | `src/app/(admin)/admin/attendance/page.tsx`    | `src/features/attendance/`    |
| `/admin/settings`      | `src/app/(admin)/admin/settings/page.tsx`      | `src/features/settings/`      |

### 12e. Management Portal — POS Domain (8 routes)

| Route                              | File Path                                                       | Feature Module      |
| ---------------------------------- | --------------------------------------------------------------- | ------------------- |
| `/management/pos`                  | `src/app/(management)/management/pos/page.tsx`                  | `src/features/pos/` |
| `/management/pos/[id]`             | `src/app/(management)/management/pos/[id]/page.tsx`             | `src/features/pos/` |
| `/management/pos/[id]/modifiers`   | `src/app/(management)/management/pos/[id]/modifiers/page.tsx`   | `src/features/pos/` |
| `/management/pos/orders`           | `src/app/(management)/management/pos/orders/page.tsx`           | `src/features/pos/` |
| `/management/pos/price-lists`      | `src/app/(management)/management/pos/price-lists/page.tsx`      | `src/features/pos/` |
| `/management/pos/price-lists/[id]` | `src/app/(management)/management/pos/price-lists/[id]/page.tsx` | `src/features/pos/` |
| `/management/pos/bom`              | `src/app/(management)/management/pos/bom/page.tsx`              | `src/features/pos/` |
| `/management/pos/bom/[id]`         | `src/app/(management)/management/pos/bom/[id]/page.tsx`         | `src/features/pos/` |

### 12f. Management Portal — Procurement Domain (7 routes)

| Route                                          | File Path                                                                   | Feature Module              |
| ---------------------------------------------- | --------------------------------------------------------------------------- | --------------------------- |
| `/management/procurement`                      | `src/app/(management)/management/procurement/page.tsx`                      | `src/features/procurement/` |
| `/management/procurement/[id]`                 | `src/app/(management)/management/procurement/[id]/page.tsx`                 | `src/features/procurement/` |
| `/management/procurement/reorder`              | `src/app/(management)/management/procurement/reorder/page.tsx`              | `src/features/procurement/` |
| `/management/procurement/purchase-orders`      | `src/app/(management)/management/procurement/purchase-orders/page.tsx`      | `src/features/procurement/` |
| `/management/procurement/purchase-orders/[id]` | `src/app/(management)/management/procurement/purchase-orders/[id]/page.tsx` | `src/features/procurement/` |
| `/management/procurement/suppliers`            | `src/app/(management)/management/procurement/suppliers/page.tsx`            | `src/features/procurement/` |
| `/management/procurement/suppliers/[id]`       | `src/app/(management)/management/procurement/suppliers/[id]/page.tsx`       | `src/features/procurement/` |

### 12g. Management Portal — HR Domain (6 routes)

| Route                              | File Path                                                       | Feature Module             |
| ---------------------------------- | --------------------------------------------------------------- | -------------------------- |
| `/management/hr`                   | `src/app/(management)/management/hr/page.tsx`                   | `src/features/hr/`         |
| `/management/hr/[id]`              | `src/app/(management)/management/hr/[id]/page.tsx`              | `src/features/hr/`         |
| `/management/hr/shifts`            | `src/app/(management)/management/hr/shifts/page.tsx`            | `src/features/hr/`         |
| `/management/hr/attendance/ledger` | `src/app/(management)/management/hr/attendance/ledger/page.tsx` | `src/features/attendance/` |
| `/management/hr/attendance/leaves` | `src/app/(management)/management/hr/attendance/leaves/page.tsx` | `src/features/leave/`      |
| `/management/hr/attendance/queue`  | `src/app/(management)/management/hr/attendance/queue/page.tsx`  | `src/features/attendance/` |

### 12h. Management Portal — Inventory Domain (11 routes)

| Route                                       | File Path                                                                | Feature Module            |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| `/management/inventory`                     | `src/app/(management)/management/inventory/page.tsx`                     | `src/features/inventory/` |
| `/management/inventory/categories`          | `src/app/(management)/management/inventory/categories/page.tsx`          | `src/features/inventory/` |
| `/management/inventory/uom`                 | `src/app/(management)/management/inventory/uom/page.tsx`                 | `src/features/inventory/` |
| `/management/inventory/requisitions`        | `src/app/(management)/management/inventory/requisitions/page.tsx`        | `src/features/inventory/` |
| `/management/inventory/requisitions/[id]`   | `src/app/(management)/management/inventory/requisitions/[id]/page.tsx`   | `src/features/inventory/` |
| `/management/inventory/reconciliation`      | `src/app/(management)/management/inventory/reconciliation/page.tsx`      | `src/features/inventory/` |
| `/management/inventory/reconciliation/[id]` | `src/app/(management)/management/inventory/reconciliation/[id]/page.tsx` | `src/features/inventory/` |
| `/management/inventory/write-offs`          | `src/app/(management)/management/inventory/write-offs/page.tsx`          | `src/features/inventory/` |
| `/management/inventory/equipment`           | `src/app/(management)/management/inventory/equipment/page.tsx`           | `src/features/inventory/` |
| `/management/inventory/movements`           | `src/app/(management)/management/inventory/movements/page.tsx`           | `src/features/inventory/` |
| `/management/inventory/valuation`           | `src/app/(management)/management/inventory/valuation/page.tsx`           | `src/features/inventory/` |

### 12i. Management Portal — Operations Domain (5 routes)

| Route                                | File Path                                                         | Feature Module             |
| ------------------------------------ | ----------------------------------------------------------------- | -------------------------- |
| `/management/operations/incidents`   | `src/app/(management)/management/operations/incidents/page.tsx`   | `src/features/incidents/`  |
| `/management/operations/telemetry`   | `src/app/(management)/management/operations/telemetry/page.tsx`   | `src/features/operations/` |
| `/management/operations/experiences` | `src/app/(management)/management/operations/experiences/page.tsx` | `src/features/booking/`    |
| `/management/operations/scheduler`   | `src/app/(management)/management/operations/scheduler/page.tsx`   | `src/features/booking/`    |
| `/management/operations/vehicles`    | `src/app/(management)/management/operations/vehicles/page.tsx`    | `src/features/operations/` |

### 12j. Management Portal — Marketing Domain (3 routes)

| Route                             | File Path                                                      | Feature Module            |
| --------------------------------- | -------------------------------------------------------------- | ------------------------- |
| `/management/marketing/campaigns` | `src/app/(management)/management/marketing/campaigns/page.tsx` | `src/features/marketing/` |
| `/management/marketing/promos`    | `src/app/(management)/management/marketing/promos/page.tsx`    | `src/features/marketing/` |
| `/management/marketing/surveys`   | `src/app/(management)/management/marketing/surveys/page.tsx`   | `src/features/marketing/` |

### 12k. Management Portal — Maintenance Domain (4 routes)

| Route                                     | File Path                                                              | Feature Module              |
| ----------------------------------------- | ---------------------------------------------------------------------- | --------------------------- |
| `/management/maintenance/orders`          | `src/app/(management)/management/maintenance/orders/page.tsx`          | `src/features/maintenance/` |
| `/management/maintenance/vendors`         | `src/app/(management)/management/maintenance/vendors/page.tsx`         | `src/features/maintenance/` |
| `/management/maintenance/device-topology` | `src/app/(management)/management/maintenance/device-topology/page.tsx` | `src/features/devices/`     |
| `/management/maintenance/incidents`       | `src/app/(management)/management/maintenance/incidents/page.tsx`       | `src/features/incidents/`   |

### 12l. Management Portal — Shared Routes (6 routes)

| Route                       | File Path                                                | Feature Module                |
| --------------------------- | -------------------------------------------------------- | ----------------------------- |
| `/management/reports`       | `src/app/(management)/management/reports/page.tsx`       | `src/features/reports/`       |
| `/management/audit`         | `src/app/(management)/management/audit/page.tsx`         | `src/features/audit/`         |
| `/management/announcements` | `src/app/(management)/management/announcements/page.tsx` | `src/features/announcements/` |
| `/management/attendance`    | `src/app/(management)/management/attendance/page.tsx`    | `src/features/attendance/`    |
| `/management/staffing`      | `src/app/(management)/management/staffing/page.tsx`      | `src/features/staffing/`      |
| `/management/settings`      | `src/app/(management)/management/settings/page.tsx`      | `src/features/settings/`      |

### 12m. Crew Portal — Shared Routes (8 routes)

| Route                 | File Path                                    | Feature Module                |
| --------------------- | -------------------------------------------- | ----------------------------- |
| `/crew/attendance`    | `src/app/(crew)/crew/attendance/page.tsx`    | `src/features/attendance/`    |
| `/crew/schedule`      | `src/app/(crew)/crew/schedule/page.tsx`      | `src/features/hr/`            |
| `/crew/leave`         | `src/app/(crew)/crew/leave/page.tsx`         | `src/features/leave/`         |
| `/crew/incidents`     | `src/app/(crew)/crew/incidents/page.tsx`     | `src/features/incidents/`     |
| `/crew/zone-scan`     | `src/app/(crew)/crew/zone-scan/page.tsx`     | `src/features/operations/`    |
| `/crew/feedback`      | `src/app/(crew)/crew/feedback/page.tsx`      | `src/features/marketing/`     |
| `/crew/announcements` | `src/app/(crew)/crew/announcements/page.tsx` | `src/features/announcements/` |
| `/crew/settings`      | `src/app/(crew)/crew/settings/page.tsx`      | `src/features/settings/`      |

### 12n. Crew Portal — Role-Specific Routes (9 routes)

| Route                           | File Path                                              | Feature Module              |
| ------------------------------- | ------------------------------------------------------ | --------------------------- |
| `/crew/pos`                     | `src/app/(crew)/crew/pos/page.tsx`                     | `src/features/pos/`         |
| `/crew/active-orders`           | `src/app/(crew)/crew/active-orders/page.tsx`           | `src/features/pos/`         |
| `/crew/entry-validation`        | `src/app/(crew)/crew/entry-validation/page.tsx`        | `src/features/booking/`     |
| `/crew/restock`                 | `src/app/(crew)/crew/restock/page.tsx`                 | `src/features/inventory/`   |
| `/crew/logistics/restock-queue` | `src/app/(crew)/crew/logistics/restock-queue/page.tsx` | `src/features/inventory/`   |
| `/crew/logistics/po-receiving`  | `src/app/(crew)/crew/logistics/po-receiving/page.tsx`  | `src/features/procurement/` |
| `/crew/logistics/stock-count`   | `src/app/(crew)/crew/logistics/stock-count/page.tsx`   | `src/features/inventory/`   |
| `/crew/disposals`               | `src/app/(crew)/crew/disposals/page.tsx`               | `src/features/inventory/`   |
| `/crew/maintenance/orders`      | `src/app/(crew)/crew/maintenance/orders/page.tsx`      | `src/features/maintenance/` |

### 12o. Guest Routes — Public Booking (2 routes)

| Route           | File Path                               | Feature Module          |
| --------------- | --------------------------------------- | ----------------------- |
| `/book`         | `src/app/(guest)/book/page.tsx`         | `src/features/booking/` |
| `/book/payment` | `src/app/(guest)/book/payment/page.tsx` | `src/features/booking/` |

### 12p. Guest Routes — Booking Management (5 routes)

| Route                           | File Path                                               | Feature Module          |
| ------------------------------- | ------------------------------------------------------- | ----------------------- |
| `/my-booking`                   | `src/app/(guest)/my-booking/page.tsx`                   | `src/features/booking/` |
| `/my-booking/verify`            | `src/app/(guest)/my-booking/verify/page.tsx`            | `src/features/booking/` |
| `/my-booking/manage`            | `src/app/(guest)/my-booking/manage/page.tsx`            | `src/features/booking/` |
| `/my-booking/manage/biometrics` | `src/app/(guest)/my-booking/manage/biometrics/page.tsx` | `src/features/booking/` |
| `/my-booking/manage/memories`   | `src/app/(guest)/my-booking/manage/memories/page.tsx`   | `src/features/booking/` |

### 12q. Guest Routes — Survey (1 route)

| Route     | File Path                         | Feature Module            |
| --------- | --------------------------------- | ------------------------- |
| `/survey` | `src/app/(guest)/survey/page.tsx` | `src/features/marketing/` |

### 12r. Layout Files

Locale-segmented per i18n contract: actual paths are `src/app/[locale]/(admin)/layout.tsx` etc. The table omits `[locale]` for readability.

| Layout                                     | File Path                         | Providers mounted                                                                                                                                                                                            |
| ------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root layout                                | `src/app/layout.tsx`              | `ThemeProvider` + `NuqsAdapter` + `TooltipProvider` + `<Toaster />` + `next-intl` provider. **NO QueryClient at root.** Sentry boots outside the React tree via `sentry.*.config.ts` + `instrumentation.ts`. |
| Auth shell (centered card, no nav)         | `src/app/(auth)/layout.tsx`       | None beyond root.                                                                                                                                                                                            |
| Admin shell (sidebar + topbar)             | `src/app/(admin)/layout.tsx`      | `<PortalProviders>` (QueryClient).                                                                                                                                                                           |
| Management shell (sidebar + topbar)        | `src/app/(management)/layout.tsx` | `<PortalProviders>` (QueryClient).                                                                                                                                                                           |
| Crew shell (topbar + bottom tab bar)       | `src/app/(crew)/layout.tsx`       | `<PortalProviders>` (QueryClient).                                                                                                                                                                           |
| Guest shell (minimal header + back button) | `src/app/(guest)/layout.tsx`      | None beyond root.                                                                                                                                                                                            |

`<PortalProviders>` lives at `src/components/shared/portal-providers.tsx`. Its QueryClient has `staleTime: 0, gcTime: 5min` defaults so every `useQuery` call site makes an explicit staleness decision.

### 12s. Shared Components

| Component           | File Path                                       |
| ------------------- | ----------------------------------------------- |
| `SettingsPage`      | `src/components/shared/settings-page.tsx`       |
| `AttendancePage`    | `src/components/shared/attendance-page.tsx`     |
| `AnnouncementsPage` | `src/components/shared/announcements-page.tsx`  |
| `IncidentLogPage`   | `src/components/shared/incident-log-page.tsx`   |
| `DomainReportsPage` | `src/components/shared/domain-reports-page.tsx` |
| `DomainAuditTable`  | `src/components/shared/domain-audit-table.tsx`  |
| `TodaysCrewGrid`    | `src/components/shared/todays-crew-grid.tsx`    |
| `LocationSelector`  | `src/components/shared/location-selector.tsx`   |

### Design System Primitives (`src/components/ui/` — FLAT, no subfolders, no `index.ts` barrel)

| Component          | File Path                                  | Used By                                                                                                                                                                    |
| ------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KpiCard`          | `src/components/ui/kpi-card.tsx`           | All admin analytics + all management landing pages (25+ routes)                                                                                                            |
| `KpiCardRow`       | `src/components/ui/kpi-card-row.tsx`       | Wraps `KpiCard` children in responsive horizontal strip                                                                                                                    |
| `Sparkline`        | `src/components/ui/sparkline.tsx`          | Micro-chart slot inside `KpiCard` (chart-library-agnostic SVG)                                                                                                             |
| `StatusTabBar`     | `src/components/ui/status-tab-bar.tsx`     | All routes with status-based filtering (15+ routes)                                                                                                                        |
| `StatusBadge`      | `src/components/ui/status-badge.tsx`       | All status indicators across all enums (40+ statuses, 60+ routes)                                                                                                          |
| `Form`             | `src/components/ui/form.tsx`               | Canonical RHF primitives (`FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormDescription` / `FormMessage`). App-token styling; `role="alert"` on `FormMessage`. |
| `FormSubmitButton` | `src/components/ui/form-submit-button.tsx` | Submit button tuned for RHF + server-action flows (auto-disable on `isSubmitting`, spinner).                                                                               |
| Toasts             | `src/components/ui/toast-helpers.tsx`      | `toastSuccess`, `toastError`, `toastInfo`, `toastWarning`, `toastQueued`. Feature code routes through this — direct `from "sonner"` is forbidden (ESLint).                 |

### Cross-Cutting Hooks (`src/hooks/`)

| Hook               | File Path                         | Purpose                                                                                                                                                           |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useServerErrors`  | `src/hooks/use-server-errors.ts`  | Bridges `ServerActionResult.fields` into RHF's per-field error state.                                                                                             |
| `useCameraCapture` | `src/hooks/use-camera-capture.ts` | Generic browser camera — options: `{facingMode, width, height, mimeType, quality}`. Used by attendance selfie, POS selfie, zone-scan QR, biometrics face capture. |
| `useGpsFix`        | `src/hooks/use-gps-fix.ts`        | Generic two-step geolocation with Permissions API subscription. Owns its own `GpsFix` type.                                                                       |

Domain-specific hooks go to `src/features/<domain>/hooks/`, NOT `src/hooks/`.

### `TodaysCrewGrid` (Reusable Domain Component)

Used by the single consolidated `/management/staffing` route. Lives at `src/components/shared/todays-crew-grid.tsx`.

Props:

- `domainFilter: DomainKey | "all"` — resolved at render time from the `?domain=` nuqs URL param; component filters `shift_schedules` → `roles` by the selected domain's role set in a single JOIN (no per-row loop queries)
- Data: `shift_schedules` WHERE shift_date = TODAY JOIN `v_shift_attendance` JOIN `profiles` JOIN `roles`, filtered by the domain's role set

Layout unchanged from prior per-domain pages: summary header + color-coded crew card grid.

Layout:

- Summary header: "On-site: {clocked_in}/{scheduled}" | "Late: {n}" | "No-show: {n}"
- Card grid: per card shows display_name, employee_id, role display_name, shift window, attendance status — color-coded (green = on time, amber = late with duration, red = absent/no-show, grey = not yet started)

### `LocationSelector` (Reusable Behavior Component)

Used by 3 crew routes (`/crew/restock`, `/crew/disposals`, reconciliation create). Each uses the same auto-detection + fallback pattern. Lives at `src/components/shared/location-selector.tsx`.

Props:

- `autoDetect: boolean` — if true, auto-resolves via `staff_records.org_unit_id → org_units → locations.org_unit_id`
- `onSelect: (locationId: string) => void` — callback on selection
- `filterByCategory?: string` — optional category filter for location_allowed_categories

Behavior:

- On mount (if `autoDetect`): fetch own staff_record → org_unit → location. If resolved, pre-select and display as "Auto-detected: {location_name}" with "Change" link.
- Fallback: dropdown of active `locations`. Always available via "Change" link.

### `KPICard` + `KPICardRow` (Design System Primitives)

All 25+ routes that display KPI strips MUST use these CVA-governed components instead of ad-hoc card implementations. Lives at `src/components/ui/`.

**`KPICard` props:**

- `label: string` — metric name (e.g., "Active Staff")
- `value: string | number` — formatted metric value
- `icon?: ReactNode` — optional leading icon
- `delta?: { value: number, direction: 'up' | 'down' | 'neutral' }` — optional trend indicator with color coding (green up, red down, grey neutral)
- `linkTo?: string` — optional click-through URL for drill-down
- `variant?: 'default' | 'warning' | 'danger'` — CVA variant for alert-state KPIs (e.g., red for "Overdue: 5")

**`KPICardRow` props:**

- `children: ReactNode` — accepts `KPICard` children
- Renders as CSS grid: 3-5 columns on desktop, horizontal scroll strip on mobile (per global responsive rules)

Each route's named KPI component (e.g., `RevenueKPIs`, `HeadcountKPIs`) becomes a thin wrapper that passes domain-specific data as props to `KPICard` + `KPICardRow`.

### `StatusTabBar` (Design System Primitive)

All 15+ routes with status-based tab filtering MUST use this CVA-governed component instead of ad-hoc tab implementations. Lives at `src/components/ui/status-tab-bar.tsx`.

**Props:**

- `tabs: Array<{ value: string, label: string, count?: number }>` — tab definitions with optional count badges
- `paramKey?: string` — nuqs param key (default: `'status'`)
- `defaultValue: string` — initial active tab

Behavior:

- Renders horizontal tab bar per global responsive rules (scrollable on mobile if > 3 tabs)
- Active tab state driven by nuqs URL param `?{paramKey}={value}`
- Count badges render as `({count})` suffix when provided
- Integrates with `@tanstack/react-query` — tab switch triggers query refetch with new status filter

### `StatusBadge` (Design System Primitive)

All status indicators across the system MUST use this CVA-governed component. Lives at `src/components/ui/status-badge.tsx`.

**Props:**

- `status: string` — the raw enum value
- `variant?: 'default' | 'outline' | 'dot'` — badge style (default: filled pill, outline: bordered, dot: small circle indicator)

**Status → Color Map (CVA variants):**

All colors reference shadcn CSS variables to adapt to light/dark theme automatically.

| Semantic Color       | CSS Class                            | Statuses                                                                                                                                           |
| -------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Green** (success)  | `bg-emerald-500/15 text-emerald-500` | `active`, `confirmed`, `completed`, `approved`, `justified`, `online`, `resolved`, `success`                                                       |
| **Amber** (warning)  | `bg-amber-500/15 text-amber-500`     | `pending`, `pending_payment`, `pending_it`, `pending_review`, `draft`, `in_progress`, `scheduled`, `partially_received`, `degraded`, `unjustified` |
| **Red** (danger)     | `bg-red-500/15 text-red-500`         | `cancelled`, `rejected`, `terminated`, `suspended`, `absent`, `no_show`, `failed`, `decommissioned`, `retired`                                     |
| **Blue** (info)      | `bg-blue-500/15 text-blue-500`       | `confirmed` (booking-specific with check-in pending), `checked_in`, `on_leave`, `sent`, `preparing`                                                |
| **Grey** (neutral)   | `bg-zinc-500/15 text-zinc-400`       | `expired`, `obsolete`, `offline`, `maintenance`, `neutral`, `paused`                                                                               |
| **Purple** (special) | `bg-violet-500/15 text-violet-500`   | `reactivation`, `transfer`, `carry_forward`                                                                                                        |

**Enum-specific overrides (when same status needs different color by context):**

| Enum                | Status              | Color | Reason                                  |
| ------------------- | ------------------- | ----- | --------------------------------------- |
| `booking_status`    | `confirmed`         | Blue  | Awaiting check-in (not yet "completed") |
| `order_status`      | `preparing`         | Blue  | Active in-progress (not warning)        |
| `po_status`         | `sent`              | Blue  | Awaiting vendor action                  |
| `mo_status`         | `active`            | Blue  | Vendor currently on-site                |
| `employment_status` | `on_leave`          | Blue  | Temporary, not a problem                |
| `employment_status` | `pending`           | Amber | Awaiting IT provisioning                |
| `vehicle_status`    | `maintenance`       | Amber | Temporary downtime                      |
| `device_status`     | `maintenance`       | Amber | Temporary downtime                      |
| `exception_type`    | `late_arrival`      | Amber | Warning severity                        |
| `exception_type`    | `early_departure`   | Amber | Warning severity                        |
| `exception_type`    | `missing_clock_in`  | Red   | Requires action                         |
| `exception_type`    | `missing_clock_out` | Red   | Requires action                         |
| `exception_type`    | `absent`            | Red   | Critical                                |

### 12t. Feature Module Structure

Each `src/features/[domain]/` directory follows this internal structure:

```
src/features/[domain]/
  components/    -- Domain-specific UI components
  actions/       -- Next.js Server Actions
  schemas/       -- Zod validation schemas
  queries/       -- React Query hooks/fetchers
  types/         -- TypeScript interfaces
```

**Feature domains and their primary owners:**

| Feature Module                | Primary Routes                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/auth/`          | `/auth/*`                                                                                                                      |
| `src/features/dashboard/`     | `/admin` (System + Executive dashboards)                                                                                       |
| `src/features/iam/`           | `/admin/iam`, `/admin/iam/[id]`                                                                                                |
| `src/features/devices/`       | `/admin/devices/*`, `/admin/system-health`, `/management/maintenance/device-topology`                                          |
| `src/features/zones/`         | `/admin/zones`                                                                                                                 |
| `src/features/org-units/`     | `/admin/org-units`                                                                                                             |
| `src/features/permissions/`   | `/admin/permissions`                                                                                                           |
| `src/features/units/`         | `/admin/units`                                                                                                                 |
| `src/features/analytics/`     | `/admin/revenue`, `/admin/operations`, `/admin/costs`, `/admin/guests`, `/admin/workforce`                                     |
| `src/features/pos/`           | `/management/pos/*`, `/crew/pos`, `/crew/active-orders`                                                                        |
| `src/features/procurement/`   | `/management/procurement/*`, `/crew/logistics/po-receiving`                                                                    |
| `src/features/hr/`            | `/management/hr/*`, `/crew/schedule`                                                                                           |
| `src/features/attendance/`    | `*/attendance`, `/management/hr/attendance/ledger`, `/management/hr/attendance/queue`                                          |
| `src/features/leave/`         | `/management/hr/attendance/leaves`, `/crew/leave`                                                                              |
| `src/features/inventory/`     | `/management/inventory/*`, `/crew/restock`, `/crew/logistics/restock-queue`, `/crew/logistics/stock-count`, `/crew/disposals`  |
| `src/features/operations/`    | `/management/operations/telemetry`, `/management/operations/vehicles`, `/crew/zone-scan`                                       |
| `src/features/booking/`       | `/management/operations/experiences`, `/management/operations/scheduler`, `/crew/entry-validation`, `/book/*`, `/my-booking/*` |
| `src/features/marketing/`     | `/management/marketing/*`, `/crew/feedback`, `/survey`                                                                         |
| `src/features/maintenance/`   | `/management/maintenance/orders`, `/management/maintenance/vendors`, `/crew/maintenance/orders`                                |
| `src/features/incidents/`     | `/management/operations/incidents`, `/management/maintenance/incidents`, `/crew/incidents`                                     |
| `src/features/reports/`       | `*/reports`                                                                                                                    |
| `src/features/audit/`         | `*/audit`                                                                                                                      |
| `src/features/announcements/` | `*/announcements`                                                                                                              |
| `src/features/settings/`      | `*/settings`                                                                                                                   |
| `src/features/staffing/`      | `*/staffing` (TodaysCrewGrid wrappers)                                                                                         |
