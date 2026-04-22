# 0007 — Universal Pattern C (Server-Injected Context)

**Status:** Accepted — 2026-04-22
**Decision owner:** Pre-Phase-5 Architecture Overhaul
**Overrides:** `frontend_spec.md §6` (Pattern A and Pattern B documentation)

---

## Context

Originally, the AgarthaOS `frontend_spec.md` modeled three shared UI component patterns:

- **Pattern A (No Props):** Shared component reads its own data server-side (e.g., `SettingsPage`).
- **Pattern B (Mode Prop):** Shared component takes an abstract `mode` string (e.g., `mode="ops"` for `IncidentLogPage`) and derives its UI affordances internally.
- **Pattern C (Server-Injected Context):** The route wrapper (acting as a controller) resolves data boundaries and permissions server-side, injecting explicit primitive props into a "dumb" shared component.

In [ADR-0005](0005-attendance-pattern-c-override.md), the `AttendancePage` was shifted from Pattern A to Pattern C because hardcoding `auth.getUser()` inside the component broke future requirements for admin "view-as" capabilities and hover previews.

While examining readiness for Phase 5 development (Settings, Announcements, Domain Reports, and Incident components), it became clear that permitting Patterns A and B allows for:

1. Hardcoded business logic leaking into presentation components (e.g., a component guessing what `mode="manage"` means).
2. Difficulty in unit testing and Storybook previews (requiring full mock Next.js/Supabase contexts).
3. Duplicated validation logic.

## Decision

**Universal Pattern C** is now the singular mandated architectural standard for all cross-portal shared components.

**Pattern A and Pattern B are officially deprecated.**
All shared components must act solely as pure presentation/functional layers that receive explicit data scopes and capability booleans (e.g., `canManage`, `canResolve`, `allowedCategories`) from their parent route wrapper. The single point of responsibility for evaluating JWT domains and user context is the RSC page wrapper.

## Consequences

### Positive

- Components are exceptionally clean, decoupled, and reusable.
- Business logic (evaluating what a user is allowed to see or do) strictly occurs server-side in the layout/page wrapper.
- Storybook and unit test integration becomes trivial because components are purely prop-driven.

### Negative

- Increases minor boilerplate in single-use pages like `SettingsPage`, as the wrapper must explicitly fetch the user and pass it down via props instead of the component fetching it itself. This overhead is accepted for the sake of universal consistency.

## Status

**Accepted** prior to Phase 5. `frontend_spec.md` has been rewritten to reflect this universal standard.
