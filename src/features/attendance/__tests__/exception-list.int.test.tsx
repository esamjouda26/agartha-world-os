import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NuqsAdapter } from "nuqs/adapters/react";

import { ExceptionList } from "@/features/attendance/components/exception-list";
import type { ExceptionRow } from "@/features/attendance/types";

/**
 * Integration test for the rewritten ExceptionList.
 *
 * Migration history:
 *   - Phase 5 used a `<DataTable>` + per-row `<Sheet>` for detail view.
 *   - Sink-migration (post-audit-pattern) replaced both with
 *     `<FilterableDataTable>` + `renderSubComponent` for INLINE
 *     expansion. The Sheet is gone — the editor renders directly under
 *     the parent row when the row is expanded.
 *
 * Coverage:
 *   - empty state
 *   - unjustified banner
 *   - row click → inline expansion reveals the clarification editor
 *   - submit → server action called → router refreshed (the row stays
 *     expanded after submit; success toast confirms)
 *   - server error → toastError called
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

const justified: ExceptionRow = {
  id: "00000000-0000-4000-8000-000000000020",
  shift_date: "2026-04-15",
  shift_type_name: "Evening",
  shift_type_code: "EVE",
  type: "early_departure",
  status: "justified",
  detail: "Left 30 minutes early.",
  punch_remark: null,
  staff_clarification: "Had a doctor's appointment.",
  hr_note: "Approved.",
  clarification_submitted_at: "2026-04-16T10:00:00Z",
  reviewed_at: "2026-04-16T14:00:00Z",
  created_at: "2026-04-15T19:30:00Z",
  attachments: [],
};

const pendingReview: ExceptionRow = {
  id: "00000000-0000-4000-8000-000000000030",
  shift_date: "2026-04-17",
  shift_type_name: "Morning",
  shift_type_code: "MORN",
  type: "absent",
  status: "pending_review",
  detail: "No-show.",
  punch_remark: null,
  staff_clarification: "Family emergency — submitted MC.",
  hr_note: null,
  clarification_submitted_at: "2026-04-18T09:00:00Z",
  reviewed_at: null,
  created_at: "2026-04-17T08:00:00Z",
  attachments: [],
};

function renderList(rows: ExceptionRow[]) {
  return render(
    <NuqsAdapter>
      <ExceptionList rows={rows} staffRecordId={STAFF_RECORD_ID} />
    </NuqsAdapter>,
  );
}

/** Find the data-row that hosts the row click-toggle.
 *
 * The new FilterableDataTable + DataTable composition auto-wires
 * `role="button"` on the `<tr>` for any expandable row when no caller
 * `onRowClick` is set (matches the mobile `CardListView` behavior).
 *
 * In jsdom both desktop (`<table>` inside `hidden md:block`) AND mobile
 * (`<ul>` inside `md:hidden`) render — CSS media queries don't filter
 * the DOM in a test env. We pick the first `[role="button"]` we find
 * (desktop's `<tr>`); clicking either toggles the same TanStack
 * expansion state. */
function findExpandableRow(): HTMLElement {
  const tableRoot = screen.getByTestId("attendance-exceptions-table");
  const row = tableRoot.querySelector<HTMLElement>('[role="button"]');
  if (!row) throw new Error("Expected expandable row inside attendance-exceptions-table");
  return row;
}

/** Helper for testids that may be duplicated across the desktop +
 *  mobile renderers (any control inside `renderSubComponent`'s body
 *  appears in both `StandardBody` and `CardListView` outputs). The
 *  duplicates are visually mutually-exclusive via Tailwind responsive
 *  classes; in a real browser only one is visible. We grab the first. */
function getFirstByTestId(testId: string): HTMLElement {
  const matches = screen.getAllByTestId(testId);
  return matches[0]!;
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
    // Row exists and is wired as a button (auto-toggle via DataTable).
    expect(findExpandableRow()).toBeInTheDocument();
  });

  it("expands the row inline and submits a clarification", async () => {
    submitClarificationMock.mockResolvedValue({
      success: true,
      data: { exceptionId: unjustified.id },
    });
    const user = userEvent.setup();
    renderList([unjustified]);

    await user.click(findExpandableRow());

    // Detail body renders inline under the parent row (no sheet).
    expect(getFirstByTestId(`attendance-exception-detail-${unjustified.id}`)).toBeInTheDocument();

    await user.type(
      getFirstByTestId(`attendance-clarify-input-${unjustified.id}`),
      "Stuck in traffic — took alternate route and got caught in construction.",
    );
    await user.click(getFirstByTestId(`attendance-clarify-submit-${unjustified.id}`));

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

    await user.click(findExpandableRow());
    await user.type(
      getFirstByTestId(`attendance-clarify-input-${unjustified.id}`),
      "Network was offline at the start of shift.",
    );
    await user.click(getFirstByTestId(`attendance-clarify-submit-${unjustified.id}`));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith({ success: false, error: "RATE_LIMITED" });
    });
  });

  it("renders the filter bar + pagination chrome", () => {
    renderList([unjustified, justified, pendingReview]);
    // Both filter selects and the pagination footer should be present.
    expect(screen.getByTestId("attendance-exceptions-filters")).toBeInTheDocument();
    expect(screen.getByTestId("attendance-exceptions-view")).toBeInTheDocument();
    expect(screen.getByTestId("attendance-exceptions-type")).toBeInTheDocument();
    expect(screen.getByTestId("attendance-exceptions-pagination")).toBeInTheDocument();
  });

  it("filters by view='Approved' down to only justified rows", async () => {
    const user = userEvent.setup();
    renderList([unjustified, justified, pendingReview]);

    // Sanity — all three rows are in the DOM unfiltered. Each fixture
    // has a unique formatted shift_date (`EEE, MMM d`) that's rendered
    // in BOTH the desktop table AND the mobile card list under jsdom,
    // so we use `queryAllByText` and assert count > 0.
    expect(screen.queryAllByText("Sun, Apr 19").length).toBeGreaterThan(0); // unjustified
    expect(screen.queryAllByText("Wed, Apr 15").length).toBeGreaterThan(0); // justified
    expect(screen.queryAllByText("Fri, Apr 17").length).toBeGreaterThan(0); // pending_review

    // Pick the "Approved" view filter via Radix Select.
    await user.click(screen.getByTestId("attendance-exceptions-view"));
    await user.click(screen.getByRole("option", { name: "Approved" }));

    // Justified survives; the other two are filtered out from BOTH the
    // desktop AND mobile renderers.
    expect(screen.queryAllByText("Sun, Apr 19").length).toBe(0);
    expect(screen.queryAllByText("Fri, Apr 17").length).toBe(0);
    expect(screen.queryAllByText("Wed, Apr 15").length).toBeGreaterThan(0);

    // Active-filter chip surfaces with the friendly label.
    expect(screen.getByTestId("attendance-exceptions-chip-view")).toHaveTextContent("Approved");
  });
});
