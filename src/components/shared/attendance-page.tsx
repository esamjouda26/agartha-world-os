import {
  StaffAttendanceView,
  StaffRecordNotLinkedEmptyState,
  type AttendanceSearchParams,
} from "@/features/attendance/components/staff-attendance-view";

/**
 * Shared `AttendancePage` — Pattern C (Server-Injected Context).
 *
 * This component **never** reads the JWT or fetches auth context.
 * Identity is injected as explicit props by each route wrapper,
 * per ADR-0005 / ADR-0007 (Universal Pattern C).
 *
 * The route wrapper resolves `staffRecordId` and `displayName`
 * server-side and passes them down. This component delegates
 * rendering entirely to the parametrized `<StaffAttendanceView />`.
 *
 * For admin drill-down / hover-preview surfaces the route wrapper
 * can inject any `staffRecordId` — RLS remains the security
 * boundary (see ADR-0005 §"RLS contract").
 */

export interface AttendancePageProps {
  /** Resolved staff_record_id — injected by the route wrapper. */
  staffRecordId: string;
  /** Display name for the page header — injected by the route wrapper. */
  displayName: string;
  locale: string;
  searchParams?: AttendanceSearchParams;
}

export async function AttendancePage({
  staffRecordId,
  displayName,
  locale,
  searchParams,
}: Readonly<AttendancePageProps>) {
  return (
    <StaffAttendanceView
      staffRecordId={staffRecordId}
      displayName={displayName}
      canWrite
      searchParams={searchParams ?? {}}
      locale={locale}
    />
  );
}

/** Re-export so route wrappers can render the empty state when
 *  the profile has no linked staff_record_id. */
export { StaffRecordNotLinkedEmptyState };
