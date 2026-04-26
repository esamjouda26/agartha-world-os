import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ATTENDANCE_ROUTER_PATHS } from "@/features/attendance/cache-tags";

/**
 * Cache-invalidation contract test — pins ADR-0006:
 *   - Every attendance mutation MUST call `revalidatePath(p, "page")` for
 *     every path in `ATTENDANCE_ROUTER_PATHS`.
 *   - It MUST NOT call `revalidatePath("/", "layout")` (the nuclear purge
 *     that the pre-0006 implementation used).
 *   - It MUST NOT call `revalidateTag` or `updateTag` (Data Cache APIs are
 *     reserved for future org-wide reads — see ADR-0006).
 *
 * The test drives each Server Action's code path via heavy mocking — the
 * goal is to lock in the cache-invalidation *shape*, not the RPC
 * correctness (covered elsewhere). If an action is later rewritten to
 * bypass this contract, this test fails first.
 */

const revalidatePathMock = vi.hoisted(() => vi.fn());
const revalidateTagMock = vi.hoisted(() => vi.fn());
const updateTagMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
  updateTag: updateTagMock,
}));

vi.mock("next/server", () => ({
  // `after(cb)` registers post-response work. Running the callback
  // synchronously in tests is equivalent; it keeps log assertions simple.
  after: (cb: () => void | Promise<void>) => {
    void cb();
  },
}));

// Rate-limit always passes so we reach the invalidation step.
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({
    limit: async () => ({ success: true }),
  }),
}));

// Supabase server client — auth returns a user with the `hr:c` domain; RPC
// returns a shape the action accepts as success.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "00000000-0000-0000-0000-000000000001",
            // Grant hr:c (staff submit) + hr:u (HR approve/reject) so
            // one mock supports all four actions.
            app_metadata: { domains: { hr: ["c", "u"] } },
          },
        },
      }),
    },
    rpc: async (name: string) => {
      if (name === "rpc_clock_in") {
        return {
          data: {
            punch_id: "punch-1",
            clock_in: "2026-04-21T09:00:00Z",
            expected_start_time: "09:00:00",
          },
          error: null,
        };
      }
      if (name === "rpc_clock_out") {
        return {
          data: {
            punch_id: "punch-2",
            clock_in: "2026-04-21T09:00:00Z",
            clock_out: "2026-04-21T17:00:00Z",
          },
          error: null,
        };
      }
      if (name === "rpc_submit_exception_clarification") {
        return { data: { attachment_count: 0 }, error: null };
      }
      if (name === "rpc_reject_exception_clarification") {
        return { data: null, error: null };
      }
      if (name === "rpc_justify_exception") {
        return { data: null, error: null };
      }
      if (name === "rpc_void_own_punch") {
        return { error: null };
      }
      return { data: null, error: null };
    },
  }),
}));

beforeEach(() => {
  revalidatePathMock.mockReset();
  revalidateTagMock.mockReset();
  updateTagMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function assertCorrectInvalidation() {
  // Every attendance-reading route gets busted.
  for (const path of ATTENDANCE_ROUTER_PATHS) {
    expect(revalidatePathMock).toHaveBeenCalledWith(path, "page");
  }
  // Nuclear layout purge is forbidden.
  expect(revalidatePathMock).not.toHaveBeenCalledWith("/", "layout");
  // Data Cache APIs are reserved — must not fire.
  expect(revalidateTagMock).not.toHaveBeenCalled();
  expect(updateTagMock).not.toHaveBeenCalled();
}

describe("attendance Server Actions — cache-invalidation contract (ADR-0006)", () => {
  it("clockInAction invalidates the attendance router paths surgically", async () => {
    const { clockInAction } = await import("@/features/attendance/actions/clock-in");
    const result = await clockInAction({
      gps: { lat: 1.3, lng: 103.8, accuracy: 10 },
      selfieUrl: "user/2026-04-21/clock-in-abc.webp",
      remark: null,
    });
    expect(result.success).toBe(true);
    assertCorrectInvalidation();
  });

  it("clockOutAction invalidates the attendance router paths surgically", async () => {
    const { clockOutAction } = await import("@/features/attendance/actions/clock-out");
    const result = await clockOutAction({
      gps: null,
      selfieUrl: "user/2026-04-21/clock-out-def.webp",
      remark: null,
    });
    expect(result.success).toBe(true);
    assertCorrectInvalidation();
  });

  it("submitClarificationAction invalidates the attendance router paths surgically", async () => {
    const { submitClarificationAction } =
      await import("@/features/attendance/actions/submit-clarification");
    const result = await submitClarificationAction({
      exceptionId: "00000000-0000-4000-8000-0000000000a1",
      text: "Traffic delayed arrival; receipt attached.",
      attachmentPaths: [],
    });
    expect(result.success).toBe(true);
    assertCorrectInvalidation();
  });

  it("rejectClarificationAction invalidates the attendance router paths surgically", async () => {
    const { rejectClarificationAction } =
      await import("@/features/hr/actions/reject-clarification");
    const result = await rejectClarificationAction({
      exceptionId: "00000000-0000-4000-8000-0000000000a2",
      reason: "Documentation insufficient — please attach MC.",
    });
    expect(result.success).toBe(true);
    assertCorrectInvalidation();
  });

  it("justifyExceptionAction invalidates the attendance router paths surgically", async () => {
    const { justifyExceptionAction } = await import("@/features/hr/actions/justify-exception");
    const result = await justifyExceptionAction({
      exceptionId: "00000000-0000-4000-8000-0000000000a3",
      reason: "Medical certificate verified.",
    });
    expect(result.success).toBe(true);
    assertCorrectInvalidation();
  });

  it("voidOwnPunchAction invalidates the attendance router paths surgically", async () => {
    const { voidOwnPunchAction } = await import("@/features/attendance/actions/void-own-punch");
    const result = await voidOwnPunchAction({
      punchId: "00000000-0000-4000-8000-0000000000b1",
    });
    expect(result.success).toBe(true);
    assertCorrectInvalidation();
  });
});
