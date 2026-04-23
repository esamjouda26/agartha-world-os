import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REPORTS_ROUTER_PATHS } from "@/features/reports/cache-tags";

/**
 * ADR-0006 invalidation contract for every reports Server Action:
 * `revalidatePath(p, "page")` for each router path, no layout purge,
 * no tag APIs.
 */

const revalidatePathMock = vi.hoisted(() => vi.fn<(path: string, scope: string) => void>());
const revalidateTagMock = vi.hoisted(() => vi.fn<(tag: string) => void>());
const updateTagMock = vi.hoisted(() => vi.fn<(tag: string) => void>());
const rateLimitMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));

const getUserMock = vi.hoisted(() =>
  vi.fn(async () => ({
    data: {
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        app_metadata: { domains: { reports: ["c", "r", "u", "d"] } },
      },
    },
  })),
);

const insertSingleMock = vi.hoisted(() =>
  vi.fn(async () => ({ data: { id: "00000000-0000-4000-8000-00000000babe" }, error: null })),
);

type InvokeResult = {
  data: {
    ok?: boolean;
    execution_id?: string;
    row_count?: number;
    file_url?: string;
    error?: string;
  } | null;
  error: Error | null;
};
const functionsInvokeMock = vi.hoisted(() => vi.fn<() => Promise<InvokeResult>>());

const fromMock = vi.hoisted(() =>
  vi.fn(() => ({
    insert: () => ({ select: () => ({ single: insertSingleMock }) }),
    update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    delete: () => ({ eq: () => ({ eq: async () => ({ error: null, count: 1 }) }) }),
  })),
);

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
  updateTag: updateTagMock,
}));
vi.mock("next/server", () => ({
  after: (cb: () => void | Promise<void>) => {
    void cb();
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({ limit: rateLimitMock }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
    functions: { invoke: functionsInvokeMock },
  }),
}));

beforeEach(() => {
  revalidatePathMock.mockReset();
  revalidateTagMock.mockReset();
  updateTagMock.mockReset();
  rateLimitMock.mockReset();
  rateLimitMock.mockResolvedValue({ success: true });
  functionsInvokeMock.mockReset();
  functionsInvokeMock.mockResolvedValue({
    data: {
      ok: true,
      execution_id: "00000000-0000-4000-8000-0000000c0de0",
      row_count: 42,
      file_url: "https://supabase.example/reports/signed",
    },
    error: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

function assertSurgicalInvalidation() {
  for (const path of REPORTS_ROUTER_PATHS) {
    expect(revalidatePathMock).toHaveBeenCalledWith(path, "page");
  }
  expect(revalidatePathMock).not.toHaveBeenCalledWith("/", "layout");
  expect(revalidateTagMock).not.toHaveBeenCalled();
  expect(updateTagMock).not.toHaveBeenCalled();
}

describe("reports Server Actions — ADR-0006 cache invalidation", () => {
  const uuid = "00000000-0000-4000-8000-000000000001";

  it("generateReportNowAction invalidates paths surgically", async () => {
    const { generateReportNowAction } =
      await import("@/features/reports/actions/generate-report-now");
    const result = await generateReportNowAction({
      reportType: "daily_sales",
      parameters: { date_range: { preset: "today", from: null, to: null }, extras: {} },
    });
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });

  it("saveScheduleAction invalidates paths surgically", async () => {
    const { saveScheduleAction } = await import("@/features/reports/actions/save-schedule");
    const result = await saveScheduleAction({
      id: null,
      reportType: "monthly_timesheet",
      parameters: { date_range: { preset: "last_30_days", from: null, to: null }, extras: {} },
      scheduleCron: "0 6 1 * *",
      recipients: [],
      isActive: true,
    });
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });

  it("toggleScheduleActiveAction invalidates paths surgically", async () => {
    const { toggleScheduleActiveAction } =
      await import("@/features/reports/actions/toggle-schedule-active");
    const result = await toggleScheduleActiveAction({ id: uuid, isActive: false });
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });

  it("deleteScheduleAction invalidates paths surgically", async () => {
    const { deleteScheduleAction } = await import("@/features/reports/actions/delete-schedule");
    const result = await deleteScheduleAction({ id: uuid });
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });
});

describe("reports Server Actions — short-circuits", () => {
  it("generateReportNowAction rejects missing reports:r with FORBIDDEN", async () => {
    getUserMock.mockResolvedValueOnce({
      data: {
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          app_metadata: { domains: { reports: ["c"] } }, // has c but not r
        },
      },
    });
    const { generateReportNowAction } =
      await import("@/features/reports/actions/generate-report-now");
    const result = await generateReportNowAction({
      reportType: "daily_sales",
      parameters: { date_range: { preset: "today", from: null, to: null }, extras: {} },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("FORBIDDEN");
    expect(functionsInvokeMock).not.toHaveBeenCalled();
  });

  it("generateReportNowAction allows reports:r-only users (Edge Function owns the writes)", async () => {
    getUserMock.mockResolvedValueOnce({
      data: {
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          app_metadata: { domains: { reports: ["r"] } }, // read-only
        },
      },
    });
    const { generateReportNowAction } =
      await import("@/features/reports/actions/generate-report-now");
    const result = await generateReportNowAction({
      reportType: "daily_sales",
      parameters: { date_range: { preset: "today", from: null, to: null }, extras: {} },
    });
    expect(result.success).toBe(true);
    expect(functionsInvokeMock).toHaveBeenCalledTimes(1);
  });

  it("generateReportNowAction surfaces Edge Function failures as DEPENDENCY_FAILED", async () => {
    functionsInvokeMock.mockResolvedValueOnce({
      data: null,
      error: new Error("Function not deployed"),
    });
    const { generateReportNowAction } =
      await import("@/features/reports/actions/generate-report-now");
    const result = await generateReportNowAction({
      reportType: "daily_sales",
      parameters: { date_range: { preset: "today", from: null, to: null }, extras: {} },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("DEPENDENCY_FAILED");
  });
});
