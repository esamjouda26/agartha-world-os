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

const addClarificationMock = vi.hoisted(() => vi.fn());
vi.mock("@/features/attendance/actions/add-clarification", () => ({
  addClarificationAction: addClarificationMock,
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
  justification_reason: null,
  created_at: "2026-04-19T09:30:00Z",
};

function renderList(rows: ExceptionRow[]) {
  return render(
    <NuqsAdapter>
      <ExceptionList rows={rows} />
    </NuqsAdapter>,
  );
}

describe("ExceptionList", () => {
  beforeEach(() => {
    addClarificationMock.mockReset();
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
    addClarificationMock.mockResolvedValue({
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
      expect(addClarificationMock).toHaveBeenCalledWith(
        expect.objectContaining({ exceptionId: unjustified.id }),
      );
    });
    expect(routerRefreshMock).toHaveBeenCalled();
  });

  it("surfaces rate-limit errors via toastError", async () => {
    const { toastError } = await import("@/components/ui/toast-helpers");
    addClarificationMock.mockResolvedValue({ success: false, error: "RATE_LIMITED" });
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
