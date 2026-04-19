# 0001 — Unified Responsive Portal Shell

**Status:** Accepted — 2026-04-19
**Decision owner:** Phase 3 implementer

## Context

`frontend_spec.md:14-15` (higher precedence) specifies one portal-shell
pattern for all three staff portals:

- `>= md`: collapsible sidebar (full labels / icon-only, persisted in
  localStorage) + slim topbar (title + notification bell + user menu).
- `< md`: slim topbar + fixed bottom tab bar. If the filtered nav
  list exceeds 5 items, the 5th tab is "More" — a bottom Sheet that
  overflows the remaining items. **No hamburger drawer.**

`prompt.md` Master Preamble §Responsive-Strategy rule 6 (lower
precedence) reads: "Admin / Management: Sheet-based drawer on < lg.
Crew: BottomTabBar on < md." That conflicts with `frontend_spec.md`.

Per the source-of-truth precedence (`migrations > operational_workflows

> frontend_spec > prompt > CLAUDE > AGENTS`), `frontend_spec.md` wins.

## Decision

1. Implement a single primitive `src/components/shared/responsive-portal-shell.tsx`
   parameterised by a `navigation` manifest.
2. Three thin layouts — admin, management, crew — compose this primitive
   and differ only in the nav manifest they pass.
3. The shell's chrome is uniform:
   - `< md`: `slim topbar + <BottomTabBar>`; > 5 items → "More" Sheet.
   - `>= md`: `slim topbar + collapsible <Sidebar>`; state persisted in
     `SIDEBAR_COLLAPSED` cookie (for SSR) + echoed in localStorage by
     the client so client-only toggles survive refresh.
4. No hamburger drawer anywhere in staff-portal code paths.
5. Sheet usage in the shell is limited to Radix's `<Sheet side="bottom">`
   for the "More" overflow — not a side drawer.

## Consequences

- `prompt.md` §Responsive-Strategy rule 6 carries a flagged drift
  ("Admin/Management: Sheet-based drawer on < lg"). The drift is
  acknowledged here and must be reconciled in the prompt on the next
  revision; until then, `frontend_spec.md` is binding.
- Admin, management, and crew share one navigation filter contract
  (`src/lib/rbac/navigation.ts`). That same module also backs the
  command-palette `navigation` prop for all three portals.
- On `< md`, admin users get a BottomTabBar — they still have full
  access to their routes. Density just shifts.
- On `>= md`, crew users get a full sidebar — a mobile-first role
  that happens to be on a tablet/desktop is not punished.

## Follow-ups

- ~~Prompt rewrite~~ — resolved 2026-04-19: the user applied edits to
  `prompt.md` (§Master Preamble Responsive Strategy rules 2-11, Phase 3
  deliverable 5, Portal → Viewport Matrix) and `sessions.md` lines
  174-175. Staff shell is now documented as UNIFIED across admin,
  management, crew in all three source-of-truth-adjacent docs.
- Keep the design-review discipline of Phases 2A/2B: no primitive
  gets reinvented by a feature route; every shell concern lives in
  `ResponsivePortalShell`.
