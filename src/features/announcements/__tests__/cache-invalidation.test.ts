import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANNOUNCEMENTS_ROUTER_PATHS } from "@/features/announcements/cache-tags";

/**
 * Locks in ADR-0006 cache-invalidation contract across every announcement
 * Server Action:
 *   - Every successful mutation calls `revalidatePath(p, "page")` for every
 *     path in `ANNOUNCEMENTS_ROUTER_PATHS`.
 *   - No `revalidatePath("/", "layout")`.
 *   - No `revalidateTag` / `updateTag` (reserved per ADR-0006).
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
        app_metadata: { domains: { comms: ["c", "r", "u", "d"] } },
      },
    },
  })),
);
const rpcMock = vi.hoisted(() =>
  vi.fn(async (name: string) => {
    if (name === "rpc_create_announcement")
      return { data: "00000000-0000-0000-0000-000000000aaa", error: null };
    if (name === "rpc_update_announcement") return { data: null, error: null };
    if (name === "rpc_mark_all_visible_announcements_read") return { data: 3, error: null };
    return { data: null, error: null };
  }),
);
const fromMock = vi.hoisted(() =>
  vi.fn(() => {
    const builder = {
      delete: () => builder,
      upsert: async () => ({ error: null }),
      eq: async () => ({ error: null, count: 1 }),
    };
    return builder;
  }),
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
    rpc: rpcMock,
    from: fromMock,
  }),
}));

beforeEach(() => {
  revalidatePathMock.mockReset();
  revalidateTagMock.mockReset();
  updateTagMock.mockReset();
  rateLimitMock.mockReset();
  rateLimitMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

function assertSurgicalInvalidation() {
  for (const path of ANNOUNCEMENTS_ROUTER_PATHS) {
    expect(revalidatePathMock).toHaveBeenCalledWith(path, "page");
  }
  expect(revalidatePathMock).not.toHaveBeenCalledWith("/", "layout");
  expect(revalidateTagMock).not.toHaveBeenCalled();
  expect(updateTagMock).not.toHaveBeenCalled();
}

describe("announcements Server Actions — ADR-0006 cache-invalidation contract", () => {
  const validUuid = "00000000-0000-4000-8000-000000000001";

  it("createAnnouncementAction invalidates announcements paths surgically", async () => {
    const { createAnnouncementAction } =
      await import("@/features/announcements/actions/create-announcement");
    const result = await createAnnouncementAction({
      title: "Policy update",
      content: "Revised ops manual posted.",
      isPublished: true,
      expiresAt: null,
      targets: [{ target_type: "global" }],
    });
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });

  it("updateAnnouncementAction invalidates announcements paths surgically", async () => {
    const { updateAnnouncementAction } =
      await import("@/features/announcements/actions/update-announcement");
    const result = await updateAnnouncementAction({
      id: validUuid,
      title: "Policy update v2",
      content: "Revised ops manual posted v2.",
      isPublished: true,
      expiresAt: null,
      targets: [{ target_type: "global" }],
    });
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });

  it("deleteAnnouncementAction invalidates announcements paths surgically", async () => {
    const { deleteAnnouncementAction } =
      await import("@/features/announcements/actions/delete-announcement");
    const result = await deleteAnnouncementAction({ id: validUuid });
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });

  it("markAnnouncementAsReadAction invalidates announcements paths surgically", async () => {
    const { markAnnouncementAsReadAction } =
      await import("@/features/announcements/actions/mark-as-read");
    const result = await markAnnouncementAsReadAction({ announcementId: validUuid });
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });

  it("markAllAnnouncementsAsReadAction invalidates announcements paths surgically", async () => {
    const { markAllAnnouncementsAsReadAction } =
      await import("@/features/announcements/actions/mark-all-as-read");
    const result = await markAllAnnouncementsAsReadAction();
    expect(result.success).toBe(true);
    assertSurgicalInvalidation();
  });
});

describe("announcements Server Actions — auth / rate-limit short-circuits", () => {
  const validUuid = "00000000-0000-4000-8000-000000000001";

  it("createAnnouncementAction rejects missing comms:c with FORBIDDEN", async () => {
    getUserMock.mockResolvedValueOnce({
      data: {
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          app_metadata: { domains: { comms: ["r"] } }, // no "c"
        },
      },
    });
    const { createAnnouncementAction } =
      await import("@/features/announcements/actions/create-announcement");
    const result = await createAnnouncementAction({
      title: "Policy update",
      content: "Revised ops manual posted.",
      isPublished: true,
      expiresAt: null,
      targets: [{ target_type: "global" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("FORBIDDEN");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("updateAnnouncementAction returns RATE_LIMITED when the limiter denies", async () => {
    rateLimitMock.mockResolvedValueOnce({ success: false });
    const { updateAnnouncementAction } =
      await import("@/features/announcements/actions/update-announcement");
    const result = await updateAnnouncementAction({
      id: validUuid,
      title: "x",
      content: "y",
      isPublished: false,
      expiresAt: null,
      targets: [{ target_type: "global" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("RATE_LIMITED");
  });

  it("createAnnouncementAction rejects invalid input with VALIDATION_FAILED", async () => {
    const { createAnnouncementAction } =
      await import("@/features/announcements/actions/create-announcement");
    const result = await createAnnouncementAction({
      title: "",
      content: "",
      isPublished: false,
      expiresAt: null,
      targets: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("VALIDATION_FAILED");
      expect(result.fields).toBeDefined();
    }
  });
});
