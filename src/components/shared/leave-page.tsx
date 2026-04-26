import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LeaveView, type LeaveFilters } from "@/features/hr/components/leave-view";
import type { MyLeaveData } from "@/features/hr/queries/get-my-leave";

/**
 * Shared `LeavePage` — Universal Pattern C (ADR-0007).
 *
 * Receives the resolved leave data + filter context as explicit props.
 * Never reads the JWT or touches Supabase itself — every portal wrapper
 * (`/crew/leave`, `/management/leave`) resolves identity server-side
 * via `getMyLeave()` and injects it here.
 *
 * Works identically for crew and management portals.
 */

export interface LeavePageProps {
  /** Server-resolved leave data, or null if staff record isn't linked. */
  leaveData: MyLeaveData | null;
  /** Current filter values resolved from searchParams. */
  filters: LeaveFilters;
}

export function LeavePage({ leaveData, filters }: Readonly<LeavePageProps>) {
  return (
    <div className="flex h-full flex-col" data-testid="leave-page">
      <PageHeader
        eyebrow="HR"
        title="My Leave"
        description="Balances, requests and history."
        data-testid="leave-page-header"
      />
      <div className="flex-1 overflow-y-auto">
        {leaveData ? (
          <LeaveView initialData={leaveData} filters={filters} />
        ) : (
          <div className="p-4">
            <EmptyState
              variant="first-use"
              title="Leave record not linked"
              description="Contact HR to set up your staff account and link your leave entitlements."
              data-testid="leave-not-linked-empty"
            />
          </div>
        )}
      </div>
    </div>
  );
}
