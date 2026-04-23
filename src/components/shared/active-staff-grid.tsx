import { PageHeader } from "@/components/ui/page-header";

import { ActiveStaffGridView } from "@/features/staffing/components/active-staff-grid-view";
import type { ActiveStaffRow } from "@/features/staffing/queries/list-active-staff";

/**
 * Shared `ActiveStaffGrid` — Universal Pattern C
 * ([ADR-0007](../../../docs/adr/0007-universal-pattern-c.md)).
 *
 * Receives the current active-staff roster as an explicit prop.
 * Never reads the JWT itself. The route wrapper resolves the data
 * via `listActiveStaff()` (which invokes the SECURITY DEFINER RPC
 * `rpc_get_active_staff`) and injects here.
 *
 * Renders a KPI strip + role/name filters + a responsive card grid.
 * Spec anchor: frontend_spec.md §6 · TodaysCrewGrid (lines 4885-4899)
 * + §3h · /management/staffing (lines 2808-2843).
 *
 * Scope note: the original spec called this `TodaysCrewGrid` with
 * domain-filter tabs. Phase 5 ships the simpler shape agreed with
 * the user: "visible to all managers + admins, shows everyone
 * currently clocked in, filter by role / name." Renamed to
 * `ActiveStaffGrid` so the label matches the data — it's live
 * on-floor staff, not today's roster.
 */

export interface ActiveStaffGridProps {
  /** Currently-clocked-in staff (all roles, no domain filter). */
  rows: readonly ActiveStaffRow[];
}

export function ActiveStaffGrid({ rows }: Readonly<ActiveStaffGridProps>) {
  return (
    <div className="flex flex-col gap-6" data-testid="active-staff-grid">
      <PageHeader
        eyebrow="Operations"
        title="Active staff"
        description="Every staff member currently on the floor (clocked in, not yet clocked out). Filter by role or search by name."
        data-testid="active-staff-grid-header"
      />
      <ActiveStaffGridView rows={rows} />
    </div>
  );
}
