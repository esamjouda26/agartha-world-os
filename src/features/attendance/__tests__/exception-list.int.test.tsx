import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NuqsAdapter } from "nuqs/adapters/react";

import { ExceptionList } from "@/features/attendance/components/exception-list";
import type { ExceptionRow } from "@/features/attendance/types";

/**
 * Integration test for the rewritten ExceptionList (DataTable + Sheet
 * detail view). Covers: empty state; unjustified banner; opening the
 * sheet; submitting a clarification; server error via toastError.
 */

const submitClarificationMock = vi.hoisted(() => vi.fn());
vi.mock("@/features/attendance/actions/submit-clarification", () => ({
  submitClarificationAction: submitClarificationMock,
}));

// Upload path isn't exercised in these fixtures (no attachments are
// added) but the UI imports the util — stub it so the test env doesn't
// pull in the browser-only supabase client.
vi.mock("@/features/attendance/utils/upload-clarification-attachment", () => ({
  uploadClarificationAttachment: vi.fn(async () => "stub/path.webp"),
  getClarificationAttachmentSignedUrl: vi.fn(async () => "https://example/signed"),
}));

vi.mock("@/components/ui/toast-helpers", () => ({
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

const routerRefreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock, push: vi.fn(), replace: vi.fn() }),
}));

const STAFF_RECORD_ID = "00000000-0000-4000-8000-000000000aaa";

const unjustified: ExceptionRow = {
  id: "00000000-0000-4000-8000-000000000010",
  shift_date: "2026-04-19",
  shift_type_name: "Morning",
  shift_type_code: "MORN",
  type: "late_arrival",
  status: "unjustified",
  detail: "Arrived 15 minutes after grace period.",
  punch_remark: "Heavy traffic on the highway.",
  staff_clarification: null,
  hr_note: null,
  clarification_submitted_at: null,
  reviewed_at: null,
  created_at: "2026-04-19T09:30:00Z",
  attachments: [],
};

function renderList(rows: ExceptionRow[]) {
  return render(
    <NuqsAdapter>
      <ExceptionList rows={rows} staffRecordId={STAFF_RECORD_ID} />
    </NuqsAdapter>,
  );
}

describe("ExceptionList", () => {
  beforeEach(() => {
    submitClarificationMock.mockReset();
    routerRefreshMock.mockReset();
  });

  it("renders the empty state when there are no rows", () => {
    renderList([]);
    expect(screen.getByTestId("attendance-exceptions-empty")).toBeInTheDocument();
  });

  it("shows the unjustified banner and a clickable row", () => {
    renderList([unjustified]);
    expect(screen.getByTestId("attendance-exceptions-banner")).toBeInTheDocument();
    // The row in the DataTable is clickable via onRowClick (no inline
    // View button anymore).
    const tableRoot = screen.getByTestId("attendance-exceptions-table");
    expect(tableRoot).toBeInTheDocument();
    const rows = tableRoot.querySelectorAll('[role="button"]');
    expect(rows.length).toBeGreaterThan(0);
  });

  it("opens the detail sheet and submits a clarification", async () => {
    submitClarificationMock.mockResolvedValue({
      success: true,
      data: { exceptionId: unjustified.id },
    });
    const user = userEvent.setup();
    renderList([unjustified]);

    const tableRoot = screen.getByTestId("attendance-exceptions-table");
    const row = tableRoot.querySelector('[role="button"]');
    expect(row).not.toBeNull();
    await user.click(row!);
    const sheet = screen.getByTestId("attendance-exception-sheet");
    expect(sheet).toBeInTheDocument();

    await user.type(
      screen.getByTestId(`attendance-clarify-input-${unjustified.id}`),
      "Stuck in traffic — took alternate route and got caught in construction.",
    );
    await user.click(screen.getByTestId(`attendance-clarify-submit-${unjustified.id}`));

    await waitFor(() => {
      expect(submitClarificationMock).toHaveBeenCalledWith(
        expect.objectContaining({ exceptionId: unjustified.id }),
      );
    });
    expect(routerRefreshMock).toHaveBeenCalled();
  });

  it("surfaces rate-limit errors via toastError", async () => {
    const { toastError } = await import("@/components/ui/toast-helpers");
    submitClarificationMock.mockResolvedValue({ success: false, error: "RATE_LIMITED" });
    const user = userEvent.setup();
    renderList([unjustified]);

    const tableRoot = screen.getByTestId("attendance-exceptions-table");
    const row = tableRoot.querySelector('[role="button"]');
    expect(row).not.toBeNull();
    await user.click(row!);
    await user.type(
      screen.getByTestId(`attendance-clarify-input-${unjustified.id}`),
      "Network was offline at the start of shift.",
    );
    await user.click(screen.getByTestId(`attendance-clarify-submit-${unjustified.id}`));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith({ success: false, error: "RATE_LIMITED" });
    });
  });
});
