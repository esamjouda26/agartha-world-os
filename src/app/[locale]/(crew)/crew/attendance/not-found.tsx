import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";

export default function CrewAttendanceNotFound() {
  return (
    <EmptyState
      variant="first-use"
      title="Attendance record not found"
      description="The attendance entry you're looking for is unavailable. Return to the attendance home and pick today's shift."
      action={
        <Button asChild>
          <Link href="/crew/attendance">Back to Attendance</Link>
        </Button>
      }
      data-testid="attendance-not-found"
    />
  );
}
