import type { Route } from "next";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";

export default function CrewAttendanceNotFound() {
  return (
    <EmptyStateCta
      variant="first-use"
      title="Attendance record not found"
      description="The attendance entry you're looking for is unavailable. Return to the attendance home and pick today's shift."
      ctaLabel="Back to Attendance"
      href={"/crew/attendance" as Route}
      data-testid="attendance-not-found"
    />
  );
}
