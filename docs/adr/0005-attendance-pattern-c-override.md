# 0005 — AttendancePage: Pattern A → Pattern C Override

**Status:** Accepted — 2026-04-20
**Decision owner:** Pre-Phase-5 design overhaul
**Overrides:** `frontend_spec.md §6 · AttendancePage — Pattern A (no props)` ([frontend_spec.md:3789-3802](../../frontend_spec.md#L3789-L3802))
**Supersedes-for:** `AttendancePage` shared component only. `AnnouncementsPage` (Pattern B) and `DomainReportsPage` (Pattern C) are unaffected. `IncidentLogPage` (Pattern B) is unaffected.

---

## Context

`frontend_spec.md §6` models three shared-component patterns:

- **Pattern A** — no props; component self-resolves the authenticated user and
  fetches only their own data. RLS scopes at the DB. `AttendancePage` is the
  only component on this pattern.
- **Pattern B** — `mode` prop drives variants (e.g. `AnnouncementsPage` manage
  vs read-only).
- **Pattern C** — server-injected context from a thin RSC wrapper that
  pre-resolves JWT / permission context and passes it as props (e.g.
  `DomainReportsPage` with `allowedReportTypes` + `canSchedule`).

Pattern A is defensible for strictly-personal-data pages — which AttendancePage
was originally scoped as. But the design brief is now broader: users expect
modern-SaaS UX affordances that require the same component to render across
multiple identities and embedding contexts:

1. **Drill-down from roster views.** `/management/staffing` and future
   `/admin/workforce/[id]` surfaces need to show a staff member's attendance
   pane without forking the renderer.
2. **Hover previews.** A roster row hovered on desktop should reveal the
   staff's attendance mini-card without building a separate compact renderer.
3. **Shareable URLs.** "Look at my attendance last week" → pasted URL should
   deep-link into the same component for both the sharer and the viewer
   (RLS still decides what renders).
4. **Future "view as" for support.** Admin debugging a missing clock-in must
   be able to see exactly what the staff member sees.
5. **Bulk export and email preview.** Server-renders the same component once
   per staff ID for PDF payroll exports or weekly summary emails.

None of these affordances are expressible under Pattern A because the
component hardcodes `auth.getUser()` as the identity boundary. Pattern A is
therefore inadequate for the actual product surface area.

Per CLAUDE.md §0 source-of-truth precedence, `frontend_spec.md` sits above
CLAUDE.md but below migrations + operational_workflows. Changes to
`frontend_spec.md` require explicit user command — this ADR is issued under
that command.

## Decision

`AttendancePage` adopts **Pattern C** (server-injected context).

### New component hierarchy

```
src/components/shared/
  attendance-page.tsx        ← thin RSC wrapper (resolves self-context only)

src/features/attendance/
  components/
    staff-attendance-view.tsx ← parametrized renderer (accepts staffRecordId)
```

### New props contract

```ts
// The parametrized renderer — consumed by AttendancePage and (in future)
// admin/management drill-down surfaces.
export type StaffAttendanceViewProps = Readonly<{
  /** Identity the view is rendered for. RLS still gates whether the caller
   *  actually sees any rows; this prop just scopes the queries. */
  staffRecordId: string;
  /** Display name used in the page header. */
  displayName: string;
  /** Whether the caller can write (clock in/out, submit clarifications).
   *  Defaults true for self-view; future admin-view surfaces pass false
   *  to render read-only chrome. */
  canWrite?: boolean;
  /** URL-driven tab + date + month state (nuqs parsed upstream). */
  searchParams: Readonly<{ tab?: string; date?: string; month?: string }>;
  /** Locale segment used for internal redirects / links. */
  locale: string;
  /** Visual density hint. `"compact"` renders the embedded / hover-preview
   *  variant; `"default"` renders the full dashboard. Defaults to default. */
  density?: "default" | "compact";
}>;
```

### Thin wrapper (preserves the spec's "no-business-prop" contract at the page boundary)

```tsx
// src/components/shared/attendance-page.tsx — the original filename + export,
// so /admin/attendance, /management/attendance, /crew/attendance wrappers are
// unchanged. What changes is the internals: resolve self-context, delegate.

export async function AttendancePage({
  locale,
  searchParams,
}: Readonly<{
  locale: string;
  searchParams?: AttendanceSearchParams;
}>) {
  const self = await resolveSelfStaffContext(locale);
  if (!self) return <StaffRecordNotLinkedEmptyState />;
  return (
    <StaffAttendanceView
      staffRecordId={self.staffRecordId}
      displayName={self.displayName}
      canWrite
      searchParams={searchParams ?? {}}
      locale={locale}
    />
  );
}
```

### RLS contract (unchanged)

Tier-4 RLS on `timecard_punches` / `attendance_exceptions` / `v_shift_attendance`
still enforces `staff_record_id = (select staff_record_id from profiles where id = auth.uid())`
([init_schema.sql:1971](../../supabase/migrations/20260417064731_init_schema.sql#L1971)).

Passing a foreign `staffRecordId` through the new prop DOES NOT grant data
access — RLS returns an empty set. Refactor is therefore safety-neutral:
security stays in the DB; the component API just opens the door for future
authorized callers (admin drill-down) once RLS + a `hr:r`-qualified policy
land. That work is out of scope for this ADR.

## Status

**Accepted.** Implementation lands in Phase R-Design-3 of the design refactor.

## Consequences

### Positive

- Component is reusable for `/admin/workforce/[id]`, `/management/staffing`
  drill-down, hover previews, and bulk rendering. UX affordances that
  distinguish premium SaaS tools from dated self-view tools become possible.
- Dependency-injection at the component API makes unit-testing feasible
  without monkey-patching `createSupabaseServerClient()` inside the file.
- Observability instrumentation (Sentry user context, trace spans) centralizes
  in one wrapper instead of duplicating inside the component.

### Negative

- Thin wrapper adds one indirection level. Mitigated by the wrapper being ~15
  lines and living in the same file.
- `frontend_spec.md §6` is now partially overridden — future readers must
  follow the `> AMENDED BY ADR-0005` marker back here. Added discipline, not
  a defect.
- Pattern A / B / C triad becomes A (none) / B (IncidentLogPage,
  AnnouncementsPage) / C (DomainReportsPage, AttendancePage). A is now empty
  but kept in the spec as a named pattern for future self-scoped components.

## Alternatives rejected

- **Keep Pattern A + build a separate `StaffAttendanceDetail` component for
  admin drill-down.** Rejected: ~60% of rendering logic would duplicate (shift
  hero, exception list, stats panel, punch timeline) — violates DRY and
  doubles maintenance surface per CLAUDE.md §1.
- **Parametrize AttendancePage itself (keep the filename as the authority
  surface).** Rejected: changes the Pattern A shared-component contract every
  route wrapper currently imports. Keeping `AttendancePage` as the thin
  wrapper preserves the import surface; the renderer gets a new,
  feature-local name.

## Follow-ups

- When Phase 6 `/admin/workforce/[id]` lands, add a `hr:r` RLS policy on
  `timecard_punches` that permits read when the caller holds `hr:r` per the
  `v_user_effective_access` view. Adjust `canWrite` false + use
  `StaffAttendanceView` directly from the admin route.
- Update test fixtures as `StaffAttendanceView` lands; add unit tests with
  prop-injected fixtures (now possible because data is a prop).
